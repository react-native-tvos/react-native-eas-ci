#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import path from 'path';
import { echo } from 'shelljs';

import { easConstants } from './common';
import spawnAsync from '@expo/spawn-async';

const { buildDir } = easConstants;
const easBuildDir = path.resolve(buildDir, '.eas', 'build');

const easFunctions = ['installCmake', 'installJava', 'installAndroidSDK'];

const buildAndInstallEasFunctionAsync = async (easFunctionName: string) => {
  await spawnAsync('yarn', [], {
    stdio: 'inherit',
    cwd: path.resolve(easBuildDir, easFunctionName),
  });
  await spawnAsync('yarn', ['build'], {
    stdio: 'inherit',
    cwd: path.resolve(easBuildDir, easFunctionName),
  });
};

const executeScriptAsync = async () => {
  for (const easFunctionName of easFunctions) {
    await buildAndInstallEasFunctionAsync(easFunctionName);
    echo(`Installed and built ${easFunctionName}`);
  }
};

executeScriptAsync();
