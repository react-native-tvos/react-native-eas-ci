import { GluegunToolbox } from 'gluegun';
import { GluegunAskResponse } from 'gluegun/build/types/toolbox/prompt-types';
import { baseCoreVersionStringForTV } from '../../common';

type ProfileKeyType =
  | 'cut_release_branch'
  | 'build_rntester'
  | 'complete_release';

const profileDescriptions = {
  cut_release_branch: 'Cut a new release branch',
  build_rntester: 'Build RNTester apps for Apple and Android',
  complete_release:
    'Create a complete release (publish Maven artifacts, generate NPM packages)',
} as const;

const buildProfileName = (
  buildType: ProfileKeyType,
  releaseVersion: string,
) => {
  switch (buildType) {
    case 'cut_release_branch':
      return `Cut release branch for RNTV ${releaseVersion}`;
    case 'build_rntester':
      return `Build RNTester apps for RNTV ${releaseVersion}`;
    case 'complete_release':
      return `Complete release for RNTV ${releaseVersion}`;
  }
};

const buildProfile = (buildType: ProfileKeyType, releaseVersion: string) => {
  const name = buildProfileName(buildType, releaseVersion);
  const returnValue = {};
  returnValue[name] = {
    extends: buildType,
    env: {
      REACT_NATIVE_REPO_URL:
        'https://github.com/react-native-tvos/react-native-tvos',
      REACT_NATIVE_REPO_BRANCH: 'tvos-v0.76.0',
      REACT_NATIVE_RELEASE_BRANCH: `release-${releaseVersion}`,
      REACT_NATIVE_RELEASE_VERSION: releaseVersion,
      REACT_NATIVE_CORE_VERSION: baseCoreVersionStringForTV(releaseVersion),
      INCLUDE_VISION_OS: 'false',
      PUBLISH_TO_SONATYPE: buildType === 'complete_release' ? 'true' : 'false',
      PUSH_RELEASE_TO_REPO: buildType === 'build_rntester' ? 'false' : 'true',
    },
  };
  return returnValue;
};

module.exports = {
  name: 'Create a build profile',
  alias: ['cbp'],
  description: 'Create a build profile',
  run: async (toolbox: GluegunToolbox) => {
    const {
      print: { info },
    } = toolbox;

    const buildTypeSelection = {
      type: 'select',
      name: 'selection',
      message: 'Select the type of build profile to create',
      choices: Object.keys(profileDescriptions).map(
        (k) => `${k} (${profileDescriptions[k]})`,
      ),
    };

    const buildTypeResponse: GluegunAskResponse = await toolbox.prompt.ask(
      buildTypeSelection,
    );
    const buildTypeSelected = buildTypeResponse.selection.split(
      ' ',
    )[0] as unknown as ProfileKeyType;
    info(`You selected ${buildTypeSelected}`);

    const releaseVersionSelection = {
      type: 'input',
      name: 'selection',
      message: 'Input the release version you want to build',
      default: 'test',
    };

    const releaseVersionResponse = await toolbox.prompt.ask(
      releaseVersionSelection,
    );
    const releaseVersionSelected = releaseVersionResponse.selection;
    info(`You input ${releaseVersionSelected}`);

    const generatedProfile = buildProfile(
      buildTypeSelected,
      releaseVersionSelected,
    );

    info(
      `Build profile generated:\n\n${JSON.stringify(
        generatedProfile,
        null,
        2,
      )}`,
    );
  },
};
