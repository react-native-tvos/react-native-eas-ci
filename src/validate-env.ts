#!/usr/bin/env -S yarn --silent ts-node --transpile-only

'use strict';

import { repoConstants } from './common';

const envErrorMessage = `
These environment variables must be set in the build profile:
  REACT_NATIVE_REPO_URL
    e.g. https://github.com/facebook/react-native
      or https://github.com/react-native-tvos/react-native-tvos
  REACT_NATIVE_REPO_BRANCH
    e.g. main, 0.74-stable, doug/ci
`;

const signingSecretsWarningMessage = `
In the EAS build environment, these must be set as secret strings for Maven artifact signing:
  ORG_GRADLE_PROJECT_SIGNING_KEY
  ORG_GRADLE_PROJECT_SIGNING_PWD
`;

const sonatypeSecretsWarningMessage = `
In the EAS build environment, these must be set as secret strings for publishing to Sonatype:
  ORG_GRADLE_PROJECT_SONATYPE_USERNAME
  ORG_GRADLE_PROJECT_SONATYPE_PASSWORD
`;

const githubSecretsWarningMessage = `
In the EAS build environment, these must be set as secret strings for pushing a release branch to GitHub:
  GITHUB_USER
  GITHUB_TOKEN
  GIT_AUTHOR_NAME
  GIT_AUTHOR_EMAIL
  GIT_COMMITTER_NAME
  GIT_COMMITTER_EMAIL
`;

export const validateEnv = () => {
  if (!repoConstants.repoUrl.length || !repoConstants.repoBranch.length) {
    throw new Error(envErrorMessage);
  }
};

export const validateSecrets = () => {
  if (
    !process.env.ORG_GRADLE_PROJECT_SIGNING_KEY ||
    !process.env.ORG_GRADLE_PROJECT_SIGNING_PWD
  ) {
    console.warn(signingSecretsWarningMessage);
  }
  if (
    !process.env.ORG_GRADLE_PROJECT_SONATYPE_USERNAME ||
    !process.env.ORG_GRADLE_PROJECT_SONATYPE_PASSWORD
  ) {
    console.warn(sonatypeSecretsWarningMessage);
  }
  if (
    !process.env.GITHUB_USER ||
    !process.env.GITHUB_TOKEN ||
    !process.env.GIT_AUTHOR_NAME ||
    !process.env.GIT_AUTHOR_EMAIL ||
    !process.env.GIT_COMMITTER_NAME ||
    !process.env.GIT_COMMITTER_EMAIL
  ) {
    console.warn(githubSecretsWarningMessage);
  }
};

const executeScript = () => {
  validateEnv();
  validateSecrets();
};

executeScript();
