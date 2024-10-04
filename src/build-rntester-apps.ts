#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import spawnAsync from '@expo/spawn-async';

import {
  easConstants,
  repoConstants,
  cloneAndInstallBranchAsync,
  commitStagedChangesAsync,
  getCurrentCommitAsync,
  pushBranchAsync,
  validateForGitHub,
  recreateDirectoryAsync,
  unpackTarArchiveAsync,
  removeDirectoryIfNeededAsync,
  runGradlewTasksAsync,
} from './common';
import { test } from 'shelljs';
import { rm } from 'fs/promises';

const { releaseBranch, repoPath } = repoConstants;

const rnTesterPath = path.join(repoPath, 'packages', 'rn-tester');

async function executeScriptAsync() {
  validateForGitHub();

  const { mavenArtifactsPath } = easConstants;

  if (!test('-e', mavenArtifactsPath)) {
    throw new Error(
      'This script requires that Maven iOS artifacts already be built.',
    );
  }

  console.log(
    'Setting up Maven repository with local artifacts at /tmp/maven-local...',
  );

  const defaultMavenLocalRepositoryPath = path.join('/', 'tmp', 'maven-local');

  await recreateDirectoryAsync(defaultMavenLocalRepositoryPath);

  await unpackTarArchiveAsync(
    path.join(mavenArtifactsPath, 'maven-artifacts.tgz'),
    defaultMavenLocalRepositoryPath,
  );

  await cloneAndInstallBranchAsync(releaseBranch);

  console.log(`Installing Cocoapods from local artifacts...`);

  await spawnAsync('yarn', ['clean-ios'], {
    cwd: rnTesterPath,
    stdio: 'inherit',
  });

  // Set up Ruby path
  const pathComponents = ['/opt/homebrew/bin', ...process.env.PATH.split(':')];

  const podInstallEnv = {
    ...process.env,
    PATH: pathComponents.join(':'),
    RCT_NEW_ARCH_ENABLED: '1',
    USE_HERMES: '1',
  };

  await spawnAsync('./modify-hermes-engine-for-rn-tester.sh', [], {
    cwd: rnTesterPath,
    env: podInstallEnv,
    stdio: 'inherit',
  });
  await spawnAsync('pod', ['install'], {
    cwd: rnTesterPath,
    env: podInstallEnv,
    stdio: 'inherit',
  });

  console.log('Build RNTester app for Apple TV simulator (debug)...');

  await spawnAsync(
    'xcodebuild',
    [
      '-workspace',
      'RNTesterPods.xcworkspace',
      '-scheme',
      'RNTester',
      '-configuration',
      'Debug',
      '-sdk',
      'appletvsimulator',
      '-arch',
      'arm64',
      '-derivedDataPath',
      'build',
    ],
    {
      cwd: rnTesterPath,
      stdio: 'ignore',
    },
  );

  console.log('Package RNTester Apple TV app in maven_artifacts folder...');

  const rnTesterAppleTVProductsDirectory = path.join(
    rnTesterPath,
    'build',
    'Build',
    'Products',
    'Debug-appletvsimulator',
  );
  const rnTesterAppleTVArchivePath = path.join(
    mavenArtifactsPath,
    'rntester-appletv.tgz',
  );
  await spawnAsync(
    'tar',
    ['zcf', rnTesterAppleTVArchivePath, 'RNTester.app', 'RNTester.app.dSYM'],
    {
      cwd: rnTesterAppleTVProductsDirectory,
      stdio: 'inherit',
    },
  );

  console.log('Build RNTester app for Android TV simulator (debug)...');

  await removeDirectoryIfNeededAsync(
    path.join(rnTesterPath, 'android', 'app', 'build'),
  );

  await runGradlewTasksAsync([
    ':packages:rn-tester:android:app:assembleHermesDebug',
  ]);

  console.log('Package RNTester Android TV apks in maven_artifacts folder...');

  const rnTesterAndroidTVProductsDirectory = path.join(
    rnTesterPath,
    'android',
    'app',
    'build',
    'outputs',
    'apk',
    'hermes',
    'debug',
  );
  const rnTesterAndroidTVArchivePath = path.join(
    mavenArtifactsPath,
    'rntester-androidtv.tgz',
  );
  await spawnAsync(
    'tar',
    [
      'zcf',
      rnTesterAndroidTVArchivePath,
      'app-hermes-arm64-v8a-debug.apk',
      'app-hermes-armeabi-v7a-debug.apk',
      'app-hermes-x86-debug.apk',
      'app-hermes-x86_64-debug.apk',
    ],
    {
      cwd: rnTesterAndroidTVProductsDirectory,
      stdio: 'inherit',
    },
  );

  // If we get here, it is safe to remove large Maven iOS artifacts
  console.log('Remove maven-artifacts.tgz...');
  const tarballPath = path.join(mavenArtifactsPath, 'maven-artifacts.tgz');
  await rm(tarballPath);
  console.log('Done.');
}

executeScriptAsync();
