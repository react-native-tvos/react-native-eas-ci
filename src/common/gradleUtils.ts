import { promises as fs } from 'fs';
import path from 'path';
import { echo, exit } from 'shelljs';
import spawnAsync from '@expo/spawn-async';

import {
  easConstants,
  repoConstants,
  getMavenConstantsAsync,
} from './constants';

export const copyPublishGradleFileAsync = async () => {
  const { rnPackagePath } = repoConstants;
  const { sourceDir } = easConstants;
  const { isSnapshot, mavenLocalUrl } = await getMavenConstantsAsync();
  const publishGradleSrcPath = path.resolve(sourceDir, 'publish.gradle');
  const publishGradleDestPath = path.resolve(
    rnPackagePath,
    'ReactAndroid',
    'publish.gradle',
  );

  echo(`Read template publish.gradle...`);
  const publishGradleText = await fs.readFile(publishGradleSrcPath, {
    encoding: 'utf-8',
  });
  const publishGradleTextFinal = publishGradleText
    .replaceAll('$$MAVEN_TEMP_LOCAL_URL$$', `'${mavenLocalUrl}'`)
    .replaceAll('$$IS_SNAPSHOT$$', isSnapshot ? 'true' : 'false');

  echo(`Write our modified publish.gradle to ${publishGradleDestPath}...`);
  await fs.writeFile(publishGradleDestPath, publishGradleTextFinal, {
    encoding: 'utf-8',
  });
};

export const getGradleEnvAsync: () => Promise<NodeJS.ProcessEnv> = async () => {
  const { buildPlatform, buildRunner } = easConstants;

  if (buildPlatform !== 'ios' || buildRunner !== 'eas-build') {
    echo(`No special env needed for Gradle...`);
    return process.env;
  }

  const JAVA_HOME =
    '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home';
  const ANDROID_HOME = '/opt/homebrew/share/android-commandlinetools';
  const pathComponents = [
    ...process.env.PATH.split(':'),
    `${ANDROID_HOME}/cmdline-tools/latest/bin`,
    `${ANDROID_HOME}/build-tools/34.0.0`,
    `/usr/sbin`,
  ];

  echo(
    `Setting up environment for iOS Gradle: JAVA_HOME=${JAVA_HOME}, ANDROID_HOME=${ANDROID_HOME}...`,
  );

  return {
    ...process.env,
    JAVA_HOME,
    ANDROID_HOME,
    PATH: pathComponents.join(':'),
  };
};

export const runGradlewTaskAsync = async (taskName: string) => {
  const { repoPath } = repoConstants;
  const env = await getGradleEnvAsync();
  const gradlewResult = await spawnAsync('./gradlew', [taskName], {
    cwd: repoPath,
    stdio: 'inherit',
    env,
  });
  if (gradlewResult.status) {
    echo('Could not generate artifacts');
    exit(1);
  }
};
