## React Native Continuous Integration Using EAS (Expo Application Services)

This project is configured to run [EAS custom builds](https://docs.expo.dev/custom-builds/get-started/) for continuous integration of React Native, and is currently configured to do this successfully for the [RNTV (React Native for TV)](https://github.com/react-native-tvos/react-native-tvos) fork of the core repo.

Some work has also been done to generalize this project to work on the [RN core repo](https://github.com/facebook/react-native), and also work on repos that support other out-of-tree platforms.

Other project goals:

- Reduce the number of changes from core that have to be maintained in RNTV
- Make it possible for developers using RN to create their own Maven artifacts with their own customizations

To make this possible, the existing CI code from both the core repo and the TV repo have been rewritten here in Typescript to run in Node. This makes the CI code independent of any particular repo.

Already working:

- Create release artifacts for RNTV
- Create release artifacts for RN core
- Run JS unit tests for RNTV
- Run JS unit tests on RN core repo
- Publish RNTV artifacts to Sonatype
- Generate RNTV NPM packages for manual publication to NPM
- Add unit tests for the CI code

Future work:

- Run E2E tests for RNTV
- Publish an RNTV release to NPM

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
#
# Try building some profiles that already are known to work
#
# Build iOS Hermes artifact for RNTV (requires Mac M1/M2 runner)
eas build -e "Build iOS artifacts for RNTV 0.76.0-0rc2 (no VisionOS)" -p ios
# Build Android artifacts (react-android, hermes-android) for RNTV
eas build -e "Build Android artifacts for RNTV 0.76.0-0rc2" -p <ios|android>
# Run JS unit tests (can be run on ios or android runner)
eas build -e "RNTV tvos-0.76.0 unit tests" -p <ios|android>
```

### Project design and structure

- [`./.eas/build`](./.eas/build): All EAS custom build configurations are defined as YAML files in this directory. This directory also includes several [EAS build custom functions](https://docs.expo.dev/custom-builds/functions/) to install Cmake, Java, and Android SDK tools required by React Native CI.
- [./src](./src): All build scripts are Typescript sources in this directory, and run with the command `/usr/bin/env -S yarn --silent ts-node --transpile-only`.
- [./src/common](./src/common): Contains constants, types, and utilities used by all the build scripts.

### Build profiles in this repo

> Every build profile should extend one of the profiles below, adding the right values for the required and optional environment variables.

`maven_ios_artifacts`:

Builds the `react-native-artifacts` artifact for a React Native repo. The repo defined by `REACT_NATIVE_REPO_URL` is cloned from branch `REACT_NATIVE_RELEASE_BRANCH`, and the artifacts are then built using that clone.

Building the iOS artifacts requires an iOS (M1 or M2 Mac) build runner with Java, cmake, and the Android SDK and build tools installed. These installations are done by the `installCmake`, `installJava` and `installAndroidSDK` custom functions.

Android SDK installation requires that licenses be accepted by the installer. This repo follows Android's recommendations for doing this in a CI environment, by making a gzipped tar archive of the `licenses` folder from your Android SDK location (this has all the licenses that have been accepted already). The archive should be uploaded to the `ANDROID_SDK_LICENSES` secret file in EAS.

`maven_android_artifacts`:

Builds the `react-android` and `hermes-android` artifacts for a React Native repo. The repo defined by `REACT_NATIVE_REPO_URL` is cloned from branch `REACT_NATIVE_RELEASE_BRANCH`, and the artifacts are then built using that clone.

Building the Android artifacts can be done on either an Android (Linux) build runner or an iOS (M1 or M2 Mac) runner. For M1/M2 runners, the same custom functions listed above are required. Linux runners already have Java installed, so the `installJava` custom function is not needed (and is a noop on these runners). The `installCmake` and `installAndroidSDK` functions are still required, as Cmake and Ninja are not installed by default on Linux runners.

`run_unit_tests`:

This profile clones and installs the React Native repo at `REACT_NATIVE_REPO_URL` from branch `REACT_NATIVE_REPO_BRANCH`, and then simply follows the same flow as the top level script in the React Native repo (`scripts/run-ci-javascript-tests.js`) to run eslint, flow, codegen, Jest, and tslint tests. The text output of all the tests is uploaded as the build artifact for this profile. This profile can be run on either iOS or Android build runners. No custom functions are required for this profile.

`cut_release_branch`:

This profile clones `REACT_NATIVE_REPO_URL` from branch `REACT_NATIVE_REPO_BRANCH`, creates a new branch `REACT_NATIVE_RELEASE_BRANCH`, then bumps the React Native version to `REACT_NATIVE_RELEASE_VERSION` and commits the changes. If `PUSH_RELEASE_TO_REPO` is true, changes will be pushed to the repo.

`update_podfile_lock`:

This profile should only be run after Maven artifacts for `REACT_NATIVE_RELEASE_VERSION` have been published. It clones `REACT_NATIVE_REPO_URL` from branch `REACT_NATIVE_REPO_BRANCH`, executes `pod install` in the `rn-tester` project of the monorepo, and then commits the `Podfile.lock` changes. If `PUSH_RELEASE_TO_REPO` is true, changes will be pushed to the repo.

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

### Environment variable requirements

- Required for all profiles:

  - String `REACT_NATIVE_REPO_URL` (e.g. https://github.com/react-native-tvos/react-native-tvos or https://github.com/facebook/react-native)
  - String `REACT_NATIVE_REPO_BRANCH` (e.g. main, 0.74-stable, doug/ci)
  - String `REACT_NATIVE_RELEASE_BRANCH` (e.g. release-0.75.2-0, release-0.76.0-0rc0)
  - String `REACT_NATIVE_RELEASE_VERSION` (e.g. 0.75.2, 0.75.2-0, 0.76.0-0rc0)

- Required for `maven_android_artifacts`, `maven_ios_artifacts`:

  - Core version:
    - String `REACT_NATIVE_CORE_VERSION` (the core version on which TV releases are based -- for builds on RN core, it should just be equal to `REACT_NATIVE_RELEASE_VERSION`)
  - GPG signing:
    - String `ORG_GRADLE_PROJECT_SIGNING_KEY`
    - String `ORG_GRADLE_PROJECT_SIGNING_PWD`
  - Android licenses (if installing Android SDK on an iOS M1/M2 runner):
    - Secret file `ANDROID_SDK_LICENSES`
  - Sonatype API username/password (if publishing to Sonatype):
    - String `ORG_GRADLE_PROJECT_SONATYPE_USERNAME`
    - String `ORG_GRADLE_PROJECT_SONATYPE_PASSWORD`

- Optional for `maven_android_artifacts`, `maven_ios_artifacts`:

  - String `IS_SNAPSHOT` (if "true", Maven artifacts are created as snapshots instead of release artifacts)
  - String `PUBLISH_TO_SONATYPE` (if "true", Maven artifacts are published to the snapshot or staging repository in Sonatype)
  - String `INCLUDE_VISION_OS` (if "false", Vision OS frameworks are omitted from the Apple Hermes artifacts. This option should only be used in RNTV builds, not in RN core builds)

- Required for `cut_release_branch`, `update-podfile-lock`:

  - String `GITHUB_USER`
  - Secret string `GITHUB_TOKEN` (should be a secret environment variable)
  - String `GIT_AUTHOR_NAME`
  - String `GIT_AUTHOR_EMAIL`
  - String `GIT_COMMITTER_NAME`
  - String `GIT_COMMITTER_EMAIL`

- Optional for `cut_release_branch`, `update_podfile_lock`:

  - String `PUSH_RELEASE_TO_REPO` (If "true", repo changes will actually be pushed)
