#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import { echo } from 'shelljs';

import { repoConstants, getMavenConstantsAsync } from './common';

const executeScriptAsync = async () => {
  const mavenConstants = await getMavenConstantsAsync();
  echo(`repoConstants = ${JSON.stringify(repoConstants, null, 2)}`);
  echo(`mavenConstants = ${JSON.stringify(mavenConstants, null, 2)}`);
};

executeScriptAsync();
