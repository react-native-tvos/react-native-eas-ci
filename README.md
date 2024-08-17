## React Native Continuous Integration Using EAS (Expo Application Services)

This project is configured to run [EAS custom builds](https://docs.expo.dev/custom-builds/get-started/) for continuous integration of React Native, and is currently configured to do this successfully for the [RNTV (React Native for TV)](https://github.com/react-native-tvos/react-native-tvos) fork of the core repo.

Eventually, the goal is to generalize this project to work on the [RN core repo](https://github.com/facebook/react-native), and also work on repos that support other out-of-tree platforms.

Other project goals:

- Reduce the number of changes from core that have to be maintained in RNTV
- Make it possible for developers using RN to create their own Maven artifacts with their own customizations

To make this possible, the existing CI code from both the core repo and the TV repo have been rewritten here in Typescript to run in Node. This makes the CI code independent of any particular repo.

Already working:

- Create release artifacts for RNTV
- Run JS unit tests for RNTV
- Run JS unit tests on RN core repo
- Publish RNTV artifacts to Sonatype
- Generate RNTV NPM packages for manual publication to NPM

Future work:

- Add unit tests for the CI code
- Run E2E tests for RNTV
- Publish an RNTV release to NPM
- Generalize Maven artifact generation and other tasks to work on the RN core repo and other forks

### Prerequisites

- If you are not already using EAS, you will need to [sign up for a free or paid EAS account](https://docs.expo.dev/build/setup/#prerequisites).
- You will also need to install the EAS CLI (`npm i -g eas-cli`).

### Quick start

Clone this repo, then

```bash
cd react-native-eas-ci
yarn
# Initialize EAS project settings (add EAS project ID and owner to app.json)
eas init
# Build iOS Hermes artifact (react-native-artifacts) (requires Mac M1/M2 runner)
eas build -e maven_ios_artifacts_tv_snapshot_test -p ios
# Build Android artifacts (react-android, hermes-android)
eas build -e maven_android_artifacts_tv_snapshot_test -p <ios|android>
# Run JS unit tests (can be run on ios or android runner)
eas build -e run_unit_tests_tv -p <ios|android>
```

### Project design and structure

- [`./.eas/build`](./.eas/build): All EAS custom build configurations are defined as YAML files in this directory. This directory also includes several [EAS build custom functions](https://docs.expo.dev/custom-builds/functions/) to install Cmake, Java, and Android SDK tools required by React Native CI.
- [./src](./src): All build scripts are Typescript sources in this directory, and run with the command `/usr/bin/env -S yarn --silent ts-node --transpile-only`.
- [./src/common](./src/common): Contains constants, types, and utilities used by all the build scripts.

### Build profiles in this repo

`maven_ios_artifacts_tv_snapshot_test`:

Builds the `react-native-artifacts` artifact for the React Native TV repo as a Maven snapshot.

Building the iOS artifacts requires an iOS (M1 or M2 Mac) build runner with Java, cmake, and the Android SDK and build tools installed. These installations are done by the `installCmake`, `installJava` and `installAndroidSDK` custom functions.

Android SDK installation requires that licenses be accepted by the installer. This repo follows Android's recommendations for doing this in a CI environment, by making a gzipped tar archive of the `licenses` folder from your Android SDK location (this has all the licenses that have been accepted already). The archive should be uploaded to the `ANDROID_SDK_LICENSES` secret file in EAS.

`maven_android_artifacts_tv_snapshot_test`:

Builds the `react-android` and `hermes-android` artifacts for the React Native TV repo as a Maven snapshot.

Building the Android artifacts can be done on either an Android (Linux) build runner or an iOS (M1 or M2 Mac) runner. For M1/M2 runners, the same custom functions listed above are required. Linux runners already have Android SDK and Java installed, so the `installJava` and `installAndroidSDK` custom functions are not needed (and are noops on these runners). The `installCmake` function is still required, as Cmake and Ninja are not installed by default on Linux runners.

`run_unit_tests_tv`, `run_unit_tests_core`:

These profiles clone and install the React Native repo, and then simply run the top level script in the React Native repo (`scripts/run-ci-javascript-tests.js`) to run eslint, flow, codegen, Jest, and tslint tests. The text output of all the tests is uploaded as the build artifact for this profile. This profile can be run on either iOS or Android build runners. No custom functions are required for this profile.

`print_settings`:

This is a profile that runs very quickly and outputs the environment variables created by `setup-env.sh` (minus secrets). This is useful for debugging changes to the scripts before running more time-consuming build profiles.

`maven_android_artifacts_tv_release`, `maven_ios_artifacts_tv_release`:

These profiles are used to create release artifacts for the RNTV repo and publish them to Sonatype. They will only work for RNTV maintainers who have the correct signing and Sonatype credentials.

### Building React Native artifacts

[`eas.json`](./eas.json) contains predefined build profiles that will successfully build Maven release artifacts.

A release of the core or TV repo requires building three Maven artifacts:

- `react-android`: the AARs for the React Native Android native code
- `hermes-android`: the AARs for the Hermes Android native code
- `react-native-artifacts`: the iOS and tvOS Hermes frameworks

Artifacts are compressed into gzipped tar archives, and exported as the EAS build products.

Artifacts are created in the Maven namespace specified in the React Native repo itself, in the `react.internal.publishingGroup` property found in `packages/react-native/ReactAndroid/gradle.properties` in the monorepo.

### GPG signing of Maven artifacts

In order to be published to Sonatype Maven, artifact builds must be signed with a valid GPG key. To fulfill this requirement, a key pair must be created, then the private key exported per the instructions in the [`gradle-maven-publish-plugin`](https://vanniktech.github.io/gradle-maven-publish-plugin/central/#in-memory-gpg-key) documentation. The exported private key string and the password for the key must then be uploaded to EAS as secret strings `ORG_GRADLE_PROJECT_SIGNING_KEY` and `ORG_GRADLE_PROJECT_SIGNING_PWD`, respectively. The public key must be [uploaded to a public key server](https://central.sonatype.org/publish/requirements/gpg/).

[Useful document on securely creating and signing a "project key" for use cases like this](https://joemiller.me/2019/07/signing-releases-with-a-gpg-project-key/)

### Publishing Maven artifacts to Sonatype

See [Sonatype documentation](https://help.sonatype.com/en/iq-server-user-tokens.html#user-token-from-the-server-ui) for how to generate the Sonatype API username and password. Once generated, these must then be uploaded to EAS as secret strings `ORG_GRADLE_PROJECT_SONATYPE_USERNAME` and `ORG_GRADLE_PROJECT_SONATYPE_PASSWORD`.

### Adding a new custom build

Any new build profile added must meet these requirements:

- Set the required environment variables in the build profile:

  - `REACT_NATIVE_REPO_URL` (e.g. https://github.com/react-native-tvos/react-native-tvos or https://github.com/facebook/react-native)
  - `REACT_NATIVE_REPO_BRANCH` (e.g. main, 0.74-stable, doug/ci)

- Set optional environment variables in the build profile:

  - `IS_SNAPSHOT` (if true, Maven artifacts are created as snapshots instead of release artifacts)
  - `PUBLISH_TO_SONATYPE` (if true, Maven artifacts are published to the snapshot or staging repository in Sonatype)

- Set required secrets in EAS:

  - GPG signing (if building Maven artifacts):
    - String `ORG_GRADLE_PROJECT_SIGNING_KEY`
    - String `ORG_GRADLE_PROJECT_SIGNING_PWD`
  - Android licenses (if installing Android SDK on an iOS M1/M2 runner):
    - File `ANDROID_SDK_LICENSES`
  - Sonatype API username/password (if publishing to Sonatype):
    - String `ORG_GRADLE_PROJECT_SONATYPE_USERNAME`
    - String `ORG_GRADLE_PROJECT_SONATYPE_PASSWORD`

### Adding a new build configuration

Any new build configuration (one of the YAML files in [./.eas/build](./.eas/build)) must add some required build steps before running any CI on a React Native repo:

- Check out this repo
- Validate that the required environment variables are set in the EAS profile and in EAS secrets
- NPM install the repo
  - The `postinstall` step in this repo builds the `installCmake`, `installJava` and `installAndroidSDK` custom functions
- Clone the React Native repo from the specified URL branch
- Execute NPM install on React Native

```yaml
build:
  name: Any RNTV custom build
  steps:
    - eas/checkout
    - eas/install_node_modules
    - run:
        name: Validate environment settings
        command: |
          ./src/validate-env.ts
    - run:
        name: Clone React Native and install dependencies
        command: |
          ./src/clone-and-install-deps.ts
```
