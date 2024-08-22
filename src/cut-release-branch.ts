#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import { promises as fs } from 'fs';
import spawnAsync from '@expo/spawn-async';

import {
  parseVersion,
  repoConstants,
  Version,
  commitChanges,
  createNewBranch,
  getBranchName,
  getCurrentCommit,
  getPackages,
  updatePackageJson,
  applyPackageVersions,
  pushBranch,
} from './common';

const { repoPath, rnPackagePath } = repoConstants;

const GRADLE_FILE_PATH = path.join(
  rnPackagePath,
  'ReactAndroid',
  'gradle.properties',
);
const REACT_NATIVE_PACKAGE_JSON = path.join(rnPackagePath, 'package.json');

const REACT_NATIVE_RELEASE_VERSION = process.env.REACT_NATIVE_RELEASE_VERSION;

async function executeScriptAsync() {
  if (!REACT_NATIVE_RELEASE_VERSION) {
    throw new Error('REACT_NATIVE_RELEASE_VERSION is not defined');
  }
  const versionInfo = parseVersion(REACT_NATIVE_RELEASE_VERSION, 'tvrelease');

  console.log(`Updating React Native version to ${versionInfo.version}...`);

  await setReactNativeVersion(versionInfo, {
    '@react-native-tvos/virtualized-lists': versionInfo.version,
  });

  console.log('Updating and adding yarn.lock...');

  await spawnAsync('yarn', [], {
    cwd: repoPath,
    stdio: 'inherit',
  });

  await spawnAsync('yarn', ['add', '-W', 'yarn.lock'], {
    cwd: repoPath,
    stdio: 'inherit',
  });

  const releaseBranch = `release-${REACT_NATIVE_RELEASE_VERSION}`;

  const commitMessage = `Bump version number (${REACT_NATIVE_RELEASE_VERSION})`;

  const latestCommitBeforeRelease = await getCurrentCommit();
  const branchBeforeRelease = await getBranchName();
  console.log(`Branch = ${branchBeforeRelease}`);
  console.log(`Latest commit = ${latestCommitBeforeRelease}`);

  await createNewBranch(releaseBranch);

  await commitChanges(commitMessage);

  const latestCommitAfterRelease = await getCurrentCommit();
  const branchAfterRelease = await getBranchName();
  console.log(`Branch = ${branchAfterRelease}`);
  console.log(`Latest commit = ${latestCommitAfterRelease}`);

  await pushBranch(releaseBranch);
}

async function setReactNativeVersion(
  versionInfo: Version,
  dependencyVersions: { [key: string]: string },
) {
  await updateSourceFiles(versionInfo);
  await setReactNativePackageVersion(versionInfo.version, dependencyVersions);
  await updateGradleFile(versionInfo.version);
  const packages = await getPackages({
    includeReactNative: false,
    includePrivate: true,
  });
  for (const packageName in packages) {
    const packageInfo = packages[packageName];
    await updatePackageJson(packageInfo.path, packageInfo.packageJson, {
      '@react-native-tvos/virtualized-lists': versionInfo.version,
    });
  }
}

async function setReactNativePackageVersion(
  version: string,
  dependencyVersions: { [key: string]: string },
) {
  const originalPackageJsonContent = await fs.readFile(
    REACT_NATIVE_PACKAGE_JSON,
    { encoding: 'utf-8' },
  );
  const originalPackageJson = JSON.parse(originalPackageJsonContent);

  const packageJson = applyPackageVersions(
    originalPackageJson,
    dependencyVersions,
  );

  packageJson.version = version;

  await fs.writeFile(
    REACT_NATIVE_PACKAGE_JSON,
    JSON.stringify(packageJson, null, 2) + '\n',
    { encoding: 'utf-8' },
  );
}

async function updateSourceFiles(versionInfo: Version) {
  const templateData = { version: versionInfo };

  const templatePaths = [
    './common/templates/ReactNativeVersion.java-template',
    './common/templates/RCTVersion.m-template',
    './common/templates/ReactNativeVersion.h-template',
    './common/templates/ReactNativeVersion.js-template',
  ];

  const destinationPaths = [
    path.resolve(
      rnPackagePath,
      'ReactAndroid',
      'src',
      'main',
      'java',
      'com',
      'facebook',
      'react',
      'modules',
      'systeminfo',
      'ReactNativeVersion.java',
    ),
    path.resolve(rnPackagePath, 'React', 'Base', 'RCTVersion.m'),
    path.resolve(
      rnPackagePath,
      'ReactCommon',
      'cxxreact',
      'ReactNativeVersion.h',
    ),
    path.resolve(rnPackagePath, 'Libraries', 'Core', 'ReactNativeVersion.js'),
  ];

  for (let index = 0; index < templatePaths.length; index++) {
    await fs.writeFile(
      destinationPaths[index],
      require(templatePaths[index])(templateData),
      { encoding: 'utf-8' },
    );
  }
}

async function updateGradleFile(version: string) /*: Promise<void> */ {
  const contents = await fs.readFile(GRADLE_FILE_PATH, 'utf-8');

  return fs.writeFile(
    GRADLE_FILE_PATH,
    contents.replace(/^VERSION_NAME=.*/, `VERSION_NAME=${version}`),
  );
}

executeScriptAsync();
