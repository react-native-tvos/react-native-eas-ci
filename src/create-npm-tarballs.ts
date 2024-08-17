#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import { promises as fs } from 'fs';
import { test } from 'shelljs';
import spawnAsync from '@expo/spawn-async';

import { getMavenConstantsAsync, repoConstants } from './common';

const executeScriptAsync = async () => {
  const { mavenArtifactsPath } = await getMavenConstantsAsync();
  if (!test('-e', mavenArtifactsPath)) {
    await fs.mkdir(mavenArtifactsPath);
  }

  const { rnPackagePath, vlPackagePath } = repoConstants;
  await spawnAsync('npm', ['pack', '--pack-destination', mavenArtifactsPath], {
    stdio: 'inherit',
    cwd: vlPackagePath,
  });
  await spawnAsync('npm', ['pack', '--pack-destination', mavenArtifactsPath], {
    stdio: 'inherit',
    cwd: rnPackagePath,
  });
};

executeScriptAsync();
