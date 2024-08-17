#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import { echo, test } from 'shelljs';
import spawnAsync from '@expo/spawn-async';

import { repoConstants, unpackTarArchiveAsync } from './common';

const { repoPath, repoName, repoUrl, repoBranch } = repoConstants;

const executeScriptAsync = async () => {
  const sourceTarballPath = `${repoPath}.tar.gz`;
  echo(`Checking if ${sourceTarballPath} exists...`);
  if (test('-e', sourceTarballPath)) {
    echo(`Unpacking supplied RN archive at ${sourceTarballPath}...`);
    await unpackTarArchiveAsync(sourceTarballPath, '.');
  } else {
    echo(`Clone ${repoName}...`);
    await spawnAsync('git', ['clone', repoUrl, '-b', repoBranch], {
      cwd: '.',
      stdio: 'inherit',
    });
  }
  echo('Installing RN dependencies...');
  await spawnAsync('yarn', [], {
    cwd: repoPath,
    stdio: 'inherit',
  });
  echo('Done.');
};

executeScriptAsync();
