import { BuildStepContext, BuildStepEnv } from '@expo/steps';
import spawn from '@expo/spawn-async';

/**
 * Installs Ruby for iOS build runners.
 */
async function installRuby(
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
  if (env.EAS_BUILD_PLATFORM === 'ios') {
    await installRubyForIos(ctx, { env });
  }
}

async function installRubyForIos(
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
  ctx.logger.info('Installing ruby from brew...');
  await spawn(brewPath, ['install', 'ruby-install'], {
    env: localEnv,
    stdio: 'inherit',
  });
  await spawn('ruby-install', ['ruby', '3.3.5', '--system'], {
    env: localEnv,
    stdio: 'inherit',
  });
  await spawn('bundle', ['config', '--global', 'set', 'path.system', 'true'], {
    env: localEnv,
    stdio: 'inherit',
  });
  ctx.logger.info('Done.');
}

export default installRuby;
