import { BuildStepContext, BuildStepEnv } from '@expo/steps';
import spawn from '@expo/spawn-async';

/**
 * Installs the Java SDK for iOS build runners.
 */
async function installJava(
  ctx: BuildStepContext,
  {
    env,
  }: {
    env: BuildStepEnv;
  },
) {
  if (env.EAS_BUILD_RUNNER !== 'eas-build') {
    ctx.logger.info(
      'We are not running in an EAS build environment, so no install is needed... Exiting.',
    );
    return;
  }
  if (env.EAS_BUILD_PLATFORM !== 'ios') {
    ctx.logger.info(
      'This custom function is only supported for builds on iOS workers. Exiting.',
    );
    return;
  }
  ctx.logger.info('Installing Java from brew...');
  await installJavaFromBrewAsync(env);
  ctx.logger.info('Done.');
}

async function installJavaFromBrewAsync(env: BuildStepEnv) {
  const brewPath = '/opt/homebrew/bin/brew';
  const localEnv = {
    ...env,
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_INSTALL_CLEANUP: '1',
  };

  await spawn(brewPath, ['install', 'openjdk@17'], {
    env: localEnv,
  });
}

export default installJava;
