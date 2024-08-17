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

const repoUrl = process.env.REACT_NATIVE_REPO_URL ?? '';
const repoBranch = process.env.REACT_NATIVE_REPO_BRANCH ?? '';
const repoName = path.basename(repoUrl);
const repoPath = path.join(buildDir, repoName);
const rnPackagePath = path.join(repoPath, 'packages', 'react-native');
const vlPackagePath = path.join(repoPath, 'packages', 'virtualized-lists');

export const repoConstants: RepoConstants = {
  repoUrl,
  repoName,
  repoBranch,
  rnPackagePath,
  vlPackagePath,
  repoPath,
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
    const isSnapshot = boolValueFromString(process.env.IS_SNAPSHOT);
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
    const publishToSonatype = boolValueFromString(
      process.env.PUBLISH_TO_SONATYPE,
    );
    return {
      namespace,
      mavenLocalPath,
      mavenLocalUrl,
      mavenArtifactsPath,
      isSnapshot,
      releaseVersion,
      publishToSonatype,
    };
  };
