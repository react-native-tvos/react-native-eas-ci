#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import spawnAsync from '@expo/spawn-async';

import {
  repoConstants,
  cloneAndInstallBranchAsync,
  commitChangesAsync,
  getCurrentCommitAsync,
  pushBranchAsync,
  validateForGitHub,
} from './common';

const { repoPath, releaseBranch, pushReleaseToRepo } = repoConstants;

const rnTesterPath = path.join(repoPath, 'packages', 'rn-tester');

async function executeScriptAsync() {
  validateForGitHub();

  await cloneAndInstallBranchAsync(releaseBranch);

  console.log(`Installing Cocoapods...`);

  await spawnAsync('yarn', ['clean-ios'], {
    cwd: rnTesterPath,
    stdio: 'inherit',
  });

  await spawnAsync('yarn', ['setup-ios-hermes'], {
    cwd: rnTesterPath,
    stdio: 'inherit',
  });

  console.log(`Add commit to release branch...`);

  await spawnAsync('git', ['add', 'Podfile.lock'], {
    cwd: rnTesterPath,
    stdio: 'inherit',
  });

  const latestCommitBeforeRelease = await getCurrentCommitAsync();
  console.log(`Latest commit = ${latestCommitBeforeRelease}`);

  await commitChangesAsync('Update Podfile.lock');

  const latestCommitAfterRelease = await getCurrentCommitAsync();
  console.log(`Latest commit = ${latestCommitAfterRelease}`);

  if (pushReleaseToRepo) {
    await pushBranchAsync();
  }
}

executeScriptAsync();
