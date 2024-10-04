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
import { podInstallRnTesterAsync } from './common/podInstallRnTester';

const { repoName, repoPath, releaseBranch, pushReleaseToRepo } = repoConstants;

const rnTesterPath = path.join(repoPath, 'packages', 'rn-tester');

async function executeScriptAsync() {
  validateForGitHub();

  await cloneAndInstallBranchAsync(releaseBranch);

  console.log(`Installing Cocoapods...`);

  await podInstallRnTesterAsync(false);

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
