#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import spawnAsync from '@expo/spawn-async';

import {
  repoConstants,
  commitChanges,
  getCurrentCommit,
  pushBranch,
  getMavenConstantsAsync,
} from './common';

const { repoPath } = repoConstants;

const rnTesterPath = path.join(repoPath, 'packages', 'rn-tester');

async function executeScriptAsync() {
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

  const latestCommitBeforeRelease = await getCurrentCommit();
  console.log(`Latest commit = ${latestCommitBeforeRelease}`);

  await commitChanges('Update Podfile.lock');

  const latestCommitAfterRelease = await getCurrentCommit();
  console.log(`Latest commit = ${latestCommitAfterRelease}`);

  const { pushReleaseToRepo } = await getMavenConstantsAsync();

  if (pushReleaseToRepo) {
    await pushBranch();
  }
}

executeScriptAsync();
