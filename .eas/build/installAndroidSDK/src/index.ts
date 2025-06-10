import { BuildStepContext, BuildStepEnv } from '@expo/steps';
import spawn from '@expo/spawn-async';
import glob from 'glob';

const jdkHomePaths = glob.sync(
  '/opt/homebrew/Cellar/openjdk@17/*/libexec/openjdk.jdk/Contents/Home',
);

const jdkHomePath =
  jdkHomePaths.length > 0
    ? jdkHomePaths[0]
    : '/opt/homebrew/Cellar/openjdk@17/17.0.15/libexec/openjdk.jdk/Contents/Home';

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
  // Validate that licenses tar archive exists
  await validateLicensesAsync(env);
  // Install Android command line tools on iOS
  if (isIosRunner(env)) {
    ctx.logger.info('Installing Android command line tools...');
    await installAndroidCommandLineToolsFromBrewAsync(env);
  }
  ctx.logger.info('Run sdkmanager license tool...');
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
  const androidSdkPath = isIosRunner(env)
    ? '/opt/homebrew/share/android-commandlinetools'
    : process.env.ANDROID_SDK_ROOT;
  const licensesTarballPath = env.ANDROID_SDK_LICENSES as unknown as string;

  await spawn('tar', ['zxf', licensesTarballPath], {
    cwd: androidSdkPath,
    stdio: 'inherit',
  });
  const localEnv = {
    ...env,
    ...(isIosRunner(env)
      ? {
          JAVA_HOME: jdkHomePath,
        }
      : {}),
  };
  await spawn('sdkmanager', ['--licenses', '--verbose'], {
    env: localEnv,
    stdio: 'inherit',
  });
}

async function installAndroidDependencyAsync(
  dependencyName: string,
  env: BuildStepEnv,
) {
  const localEnv = {
    ...env,
    ...(isIosRunner(env)
      ? {
          JAVA_HOME: jdkHomePath,
        }
      : {}),
  };
  await spawn('sdkmanager', ['--install', dependencyName, '--verbose'], {
    env: localEnv,
    stdio: 'ignore',
  });
}

function isIosRunner(env: BuildStepEnv): boolean {
  return env.EAS_BUILD_PLATFORM === 'ios';
}

export default installAndroidSDK;
