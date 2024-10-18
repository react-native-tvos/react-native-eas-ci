import { GluegunToolbox } from 'gluegun';
import { PromptOptions } from 'gluegun/build/types/toolbox/prompt-enquirer-types';
import path from 'path';
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

import {
  baseCoreVersionStringForTV,
  doesBranchExistAtUrlAsync,
  doesTagExistAtUrlAsync,
  readFileFromPathAsync,
} from '../../common';
import { EasJsonBuildProfile } from '@expo/eas-json/build/build/types';

type EasJson = {
  cli?: {
    version?: string;
    requireCommit?: boolean;
    appVersionSource?: 'local' | 'remote';
    promptToConfigurePushNotifications?: boolean;
  };
  build?: {
    [profileName: string]: EasJsonBuildProfile;
  };
};

dotenv.config();

const repoUrl =
  process.env.CLI_REPO_URL ??
  'https://github.com/react-native-tvos/react-native-tvos';
const devBranch = process.env.CLI_DEV_BRANCH ?? 'tvos-v0.76.0';

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

const releaseBranchForVersion = (releaseVersion: string) =>
  `release-${releaseVersion}`;

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

const buildProfile = (
  buildType: ProfileKeyType,
  releaseVersion: string,
): EasJsonBuildProfile => {
  const returnValue = {
    extends: buildType,
    env: {
      REACT_NATIVE_REPO_URL: repoUrl,
      REACT_NATIVE_REPO_BRANCH: devBranch,
      REACT_NATIVE_RELEASE_BRANCH: releaseBranchForVersion(releaseVersion),
      REACT_NATIVE_RELEASE_VERSION: releaseVersion,
      REACT_NATIVE_CORE_VERSION: baseCoreVersionStringForTV(releaseVersion),
      INCLUDE_VISION_OS: 'false',
      PUBLISH_TO_SONATYPE: buildType === 'complete_release' ? 'true' : 'false',
      PUSH_RELEASE_TO_REPO: buildType === 'build_rntester' ? 'false' : 'true',
    },
  };
  return returnValue;
};

const validateSelectionsAsync = async (
  buildTypeSelected: ProfileKeyType,
  releaseVersionSelected: string,
  error: (message: string) => void,
) => {
  const branchNameSelected = releaseBranchForVersion(releaseVersionSelected);

  const releaseBranchExists = await doesBranchExistAtUrlAsync(
    repoUrl,
    branchNameSelected,
  );

  const releaseTagExists = await doesTagExistAtUrlAsync(
    repoUrl,
    `v${releaseVersionSelected}`,
  );

  if (buildTypeSelected === 'cut_release_branch') {
    if (releaseBranchExists) {
      error(
        `Branch ${branchNameSelected} already exists. You cannot cut a new release branch of the same name.`,
      );
      return false;
    }
  } else if (!releaseBranchExists) {
    error(
      `Branch ${branchNameSelected} does not exist on the repo. You cannot build test or release artifacts with this branch.`,
    );
    return false;
  } else if (buildTypeSelected === 'complete_release' && releaseTagExists) {
    error(
      `Version ${releaseVersionSelected} has already been published, you cannot run a new complete release.`,
    );
    return false;
  }
  return true;
};

module.exports = {
  name: 'Create a build profile',
  alias: ['cbp'],
  description: 'Create a build profile',
  run: async (toolbox: GluegunToolbox) => {
    const {
      parameters,
      print: { info, error },
    } = toolbox;

    let [buildTypeSelectedString, releaseVersionSelected, addToEASJsonString] =
      parameters.array;

    let buildTypeSelected: ProfileKeyType = 'build_rntester';
    if (buildTypeSelectedString === undefined) {
      buildTypeSelected = (
        await toolbox.prompt.ask({
          type: 'select',
          name: 'selection',
          message: 'Select the type of build profile to create',
          choices: Object.keys(profileDescriptions).map(
            (k) => `${k} (${profileDescriptions[k]})`,
          ),
        } as PromptOptions)
      ).selection.split(' ')[0] as unknown as ProfileKeyType;
    } else {
      buildTypeSelected = buildTypeSelectedString as unknown as ProfileKeyType;
    }
    info(`You selected ${buildTypeSelected}`);

    if (releaseVersionSelected === undefined) {
      releaseVersionSelected = (
        await toolbox.prompt.ask({
          type: 'input',
          name: 'selection',
          message: 'Input the release version you want to build',
          default: process.env.CLI_RELEASE_VERSION ?? '0.76.0-0rc4',
        } as PromptOptions)
      ).selection;
    }
    info(`You input ${releaseVersionSelected}`);

    const valid = await validateSelectionsAsync(
      buildTypeSelected,
      releaseVersionSelected,
      error,
    );
    if (!valid) {
      return;
    }

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

    let addToEASJson = false;
    if (addToEASJsonString === undefined) {
      addToEASJson = await toolbox.prompt.confirm(
        'Add this profile to eas.json?',
      );
    } else {
      addToEASJson = new Set(['Y', 'y', '1', 'yes', 'YES']).has(
        addToEASJsonString,
      );
    }

    if (addToEASJson) {
      const name = buildProfileName(buildTypeSelected, releaseVersionSelected);
      const easJsonPath = path.resolve(process.env.PWD, 'eas.json');
      const easJsonString = await readFileFromPathAsync(easJsonPath);
      const easJson: EasJson = JSON.parse(easJsonString) as EasJson;
      easJson.build[name] = generatedProfile;
      await writeFile(easJsonPath, JSON.stringify(easJson, null, 2), {
        encoding: 'utf-8',
      });
      info(`New profile "${name}" added to eas.json.`);
    } else {
      info('No changes made to eas.json.');
    }
  },
};
