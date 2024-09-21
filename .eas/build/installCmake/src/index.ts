import { BuildStepContext, BuildStepEnv } from '@expo/steps';
import spawn from '@expo/spawn-async';
import { promises as fs } from 'fs';
import path from 'path';
import spawnAsync from '@expo/spawn-async';
import { tmpdir } from 'os';

/**
 * Installs the Java SDK for iOS build runners.
 */
async function installCmake(
  ctx: BuildStepContext,
  {
    env,
  }: {
    env: BuildStepEnv;
  },
) {
  if (env.EAS_BUILD_PLATFORM === 'ios') {
    ctx.logger.info('Seeing if a simple atomic c++ program compiles...');
    await testCplusCompileForIos();
    ctx.logger.info('Success.');
  }
  if (env.EAS_BUILD_RUNNER !== 'eas-build') {
    ctx.logger.info(
      'We are not running in an EAS build environment, so no install is needed... Exiting.',
    );
    return;
  }
  if (env.EAS_BUILD_PLATFORM === 'ios') {
    await installCmakeForIos(ctx, { env });
  } else {
    await installCmakeForAndroid(ctx, { env });
  }
}

async function installCmakeForAndroid(
  ctx: BuildStepContext,
  {
    env,
  }: {
    env: BuildStepEnv;
  },
) {
  ctx.logger.info('Installing cmake and ninja from apt-get...');
  await spawn('sudo', ['apt-get', 'install', '--yes', 'cmake'], {
    env,
    stdio: 'inherit',
  });
  await spawn('sudo', ['apt-get', 'install', '--yes', 'ninja-build'], {
    env,
    stdio: 'inherit',
  });
  ctx.logger.info('Done.');
}

async function installCmakeForIos(
  ctx: BuildStepContext,
  {
    env,
  }: {
    env: BuildStepEnv;
  },
) {
  const brewPath = '/opt/homebrew/bin/brew';
  const localEnv = {
    ...env,
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_INSTALL_CLEANUP: '1',
  };
  ctx.logger.info('Installing cmake from brew...');
  await spawn(brewPath, ['install', 'cmake'], {
    env: localEnv,
    stdio: 'inherit',
  });
  ctx.logger.info('Done.');
}

async function testCplusCompileForIos() {
  const testProgram = `
#include <atomic>
std::atomic<int> x;
int main() {
  return x;
}
  `;
  const tempDirPath = await fs.mkdtemp(path.join(tmpdir(), 'test-'), {
    encoding: 'utf-8',
  });
  const testProgramPath = path.join(tempDirPath, 'test.cpp');
  await fs.writeFile(testProgramPath, testProgram, { encoding: 'utf-8' });
  await spawnAsync('c++', [testProgramPath], {
    cwd: tempDirPath,
    stdio: 'inherit',
  });
}

export default installCmake;
