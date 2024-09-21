import { promises as fs } from 'fs';
import path from 'path';
import { test } from 'shelljs';
import { pathToFileURL } from 'url';

import { RepoConstants, MavenConstants, EasConstants } from './types';

const boolValueFromString: (testString: string) => boolean = (testString) => {
  return testString === '1' || testString === 'true' || testString === 'TRUE';
};

const buildDir = process.env.EAS_BUILD_WORKINGDIR ?? '.';
const sourceDir = path.resolve(buildDir, 'src');
const buildRunner = process.env.EAS_BUILD_RUNNER ?? '';
const buildPlatform = process.env.EAS_BUILD_PLATFORM ?? '';
const isBuildLocal = buildRunner !== 'eas-build';
const isSnapshot = boolValueFromString(process.env.IS_SNAPSHOT);
const publishToSonatype = boolValueFromString(process.env.PUBLISH_TO_SONATYPE);
const pushReleaseToRepo = boolValueFromString(process.env.PUSH_RELEASE_TO_REPO);
const repoUrl = process.env.REACT_NATIVE_REPO_URL ?? '';
const repoBranch = process.env.REACT_NATIVE_REPO_BRANCH ?? '';
const releaseBranch = process.env.REACT_NATIVE_RELEASE_BRANCH ?? '';
const releaseVersion = process.env.REACT_NATIVE_RELEASE_VERSION ?? '';
const repoName = path.basename(repoUrl);
const repoPath = path.join(buildDir, repoName);
const rnPackagePath = path.join(repoPath, 'packages', 'react-native');
const vlPackagePath = path.join(repoPath, 'packages', 'virtualized-lists');

export const repoConstants: RepoConstants = {
  repoUrl,
  repoName,
  repoBranch,
  releaseBranch,
  releaseVersion,
  rnPackagePath,
  vlPackagePath,
  repoPath,
  isSnapshot,
  publishToSonatype,
  pushReleaseToRepo,
};

export const easConstants: EasConstants = {
  buildDir,
  sourceDir,
  buildRunner,
  buildPlatform,
  isBuildLocal,
};

export const getMavenConstantsAsync: () => Promise<MavenConstants> =
  async () => {
    const { repoPath, rnPackagePath: packagePath } = repoConstants;

    if (!test('-e', repoPath)) {
      throw new Error('RN repo has not yet been cloned.');
    }
    const gradleProperties = await fs.readFile(
      path.resolve(packagePath, 'ReactAndroid', 'gradle.properties'),
      { encoding: 'utf-8' },
    );
    const publishingGroupLine = gradleProperties
      .split('\n')
      .filter((line) => line.startsWith('react.internal.publishingGroup='))[0];
    const namespace = publishingGroupLine
      .replace('react.internal.publishingGroup=', '')
      .replace(/\./g, '/')
      .trim();
    const mavenLocalPath = path.join(buildDir, 'maven_local');
    const mavenLocalUrl = pathToFileURL(mavenLocalPath).toString();
    const mavenArtifactsPath = path.join(buildDir, 'maven_artifacts');
    const packageJsonString = await fs.readFile(
      path.resolve(packagePath, 'package.json'),
      { encoding: 'utf-8' },
    );
    const releaseVersion = JSON.parse(packageJsonString).version;

    return {
      namespace,
      mavenLocalPath,
      mavenLocalUrl,
      mavenArtifactsPath,
      isSnapshot,
      releaseVersion,
      publishToSonatype,
      pushReleaseToRepo,
    };
  };
