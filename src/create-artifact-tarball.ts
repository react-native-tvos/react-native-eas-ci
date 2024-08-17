#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import { promises as fs } from 'fs';
import path from 'path';
import { test } from 'shelljs';
import spawnAsync from '@expo/spawn-async';

import { getMavenConstantsAsync } from './common';

const executeScriptAsync = async () => {
  const { mavenArtifactsPath, mavenLocalPath } = await getMavenConstantsAsync();
  if (!test('-e', mavenArtifactsPath)) {
    await fs.mkdir(mavenArtifactsPath);
  }
  const tarballPath = path.join(mavenArtifactsPath, 'maven-artifacts.tgz');
  const files = await fs.readdir(mavenLocalPath);
  await spawnAsync('tar', ['zcf', tarballPath, ...files], {
    cwd: mavenLocalPath,
    stdio: 'inherit',
  });
};

executeScriptAsync();
