import { BuildStepContext, BuildStepEnv } from '@expo/steps';
import spawn from '@expo/spawn-async';

/**
 * Installs the Android platform tools, build tools, SDK, and NDK.
 *
 * Requires that the `install_java` step be run first.
 * Requires that your accepted Android SDK licenses be packaged in a tar archive
 * and uploaded to EAS as secret file ANDROID_SDK_LICENSES.
 */
async function installAndroidSDK(
  ctx: BuildStepContext,
  {
    env,
  }: {
    env: BuildStepEnv;
  },
) {
  if (env.EAS_BUILD_RUNNER !== 'eas-build') {
    ctx.logger.info(
      'We are not running in an EAS build environment, so no install is needed. Done.',
    );
    return;
  }
  if (env.EAS_BUILD_PLATFORM !== 'ios') {
    ctx.logger.info(
      'This custom function is only needed for builds on iOS workers. Done.',
    );
    return;
  }
  // Validate that licenses tar archive exists
  await validateLicensesAsync(env);
  ctx.logger.info('Installing Android command line tools...');
  await installAndroidCommandLineToolsFromBrewAsync(env);
  await androidLicensesAsync(env);
  ctx.logger.info('Installing Android platform tools...');
  await installAndroidDependencyAsync('platform-tools', env);
  ctx.logger.info('Installing Android SDK 33...');
  await installAndroidDependencyAsync('platforms;android-33', env);
  ctx.logger.info('Installing Android NDK...');
  await installAndroidDependencyAsync('ndk;26.1.10909125', env);
  ctx.logger.info('Installing Android cmake...');
  await installAndroidDependencyAsync('cmake;3.22.1', env);
  ctx.logger.info('Installing Android build tools...');
  await installAndroidDependencyAsync('build-tools;34.0.0', env);
  ctx.logger.info('Done.');
}

async function installAndroidCommandLineToolsFromBrewAsync(env: BuildStepEnv) {
  const brewPath = '/opt/homebrew/bin/brew';
  const localEnv = {
    ...env,
    HOMEBREW_NO_AUTO_UPDATE: '1',
    HOMEBREW_NO_INSTALL_CLEANUP: '1',
  };

  await spawn(brewPath, ['install', '--cask', 'android-commandlinetools'], {
    env: localEnv,
  });
}

async function validateLicensesAsync(env: BuildStepEnv) {
  const licensesTarballPath = env.ANDROID_SDK_LICENSES as unknown as string;
  if (!licensesTarballPath) {
    throw new Error(
      'The secret file ANDROID_SDK_LICENSES must be set in EAS build environments, or the Android SDK cannot be installed.',
    );
  }
}

async function androidLicensesAsync(env: BuildStepEnv) {
  const androidSdkPath = '/opt/homebrew/share/android-commandlinetools';
  const licensesTarballPath = env.ANDROID_SDK_LICENSES as unknown as string;

  await spawn('tar', ['zxf', licensesTarballPath], {
    cwd: androidSdkPath,
    stdio: 'inherit',
  });
  const localEnv = {
    ...env,
    JAVA_HOME: '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  };
  await spawn('sdkmanager', ['--licenses', '--verbose'], {
    env: localEnv,
    stdio: 'ignore',
  });
}

async function installAndroidDependencyAsync(
  dependencyName: string,
  env: BuildStepEnv,
) {
  const localEnv = {
    ...env,
    JAVA_HOME: '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
  };
  await spawn('sdkmanager', ['--install', dependencyName, '--verbose'], {
    env: localEnv,
    stdio: 'ignore',
  });
}

export default installAndroidSDK;
