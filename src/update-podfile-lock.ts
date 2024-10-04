#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import spawnAsync from '@expo/spawn-async';

import {
  repoConstants,
  cloneAndInstallBranchAsync,
  commitStagedChangesAsync,
  getCurrentCommitAsync,
  pushBranchAsync,
  validateForGitHub,
} from './common';

const { repoName, repoPath, releaseBranch, pushReleaseToRepo } = repoConstants;

const rnTesterPath = path.join(repoPath, 'packages', 'rn-tester');

async function executeScriptAsync() {
  validateForGitHub();

  await cloneAndInstallBranchAsync(releaseBranch);

  console.log(`Installing Cocoapods...`);

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

  console.log(`Add commit to release branch...`);

  await spawnAsync('git', ['add', 'Podfile.lock'], {
    cwd: rnTesterPath,
    stdio: 'inherit',
  });

  const latestCommitBeforeRelease = await getCurrentCommitAsync();
  console.log(`Latest commit = ${latestCommitBeforeRelease}`);

  await commitStagedChangesAsync('Update Podfile.lock');

  const latestCommitAfterRelease = await getCurrentCommitAsync();
  console.log(`Latest commit = ${latestCommitAfterRelease}`);

  if (pushReleaseToRepo) {
    console.log(`Pushing changes to ${repoName}...`);
    await pushBranchAsync();
  } else {
    console.log('PUSH_RELEASE_TO_REPO is false, changes will not be pushed.');
  }
  console.log('Done.');
}

executeScriptAsync();
