/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict
 * @format
 * @oncall react_native
 */

import { PackageJSON, PackageInfo, PackagesFilter, ProjectInfo } from './types';

import { repoConstants } from './constants';
import { promises as fs } from 'fs';
import glob from 'glob';
import path from 'path';

const { repoName, repoPath } = repoConstants;

const WORKSPACES_CONFIG = 'packages/*';

/**
 * Locates monrepo packages and returns a mapping of package names to their
 * metadata. Considers Yarn workspaces under `packages/`.
 */
export async function getPackages(filter: PackagesFilter) {
  const { includeReactNative, includePrivate = false } = filter;

  const packagesEntries = await Promise.all(
    glob
      .sync(`${WORKSPACES_CONFIG}/package.json`, {
        cwd: repoPath,
        absolute: true,
        ignore: includeReactNative
          ? []
          : ['packages/react-native/package.json'],
      })
      .map(parsePackageInfoAsync),
  );

  return Object.fromEntries(
    packagesEntries.filter(
      ([_, { packageJson }]) => packageJson.private !== true || includePrivate,
    ),
  ) as ProjectInfo;
}

/**
 * Get the parsed package metadata for the workspace root.
 */
export async function getWorkspaceRootAsync() /*: Promise<PackageInfo> */ {
  const [, packageInfo] = await parsePackageInfoAsync(
    path.join(repoPath, 'package.json'),
  );

  return packageInfo;
}

async function parsePackageInfoAsync(
  packageJsonPath: string,
) /*: Promise<[string, PackageInfo]> */ {
  const packagePath = path.dirname(packageJsonPath);
  const packageJson /*: PackageJson */ = JSON.parse(
    await fs.readFile(packageJsonPath, 'utf-8'),
  );

  return [
    packageJson.name,
    {
      name: packageJson.name,
      version: packageJson.version,
      path: packagePath,
      packageJson,
    },
  ] as PackageInfo[];
}

/**
 * Update a given package with the package versions.
 */
export async function updatePackageJsonAsync(
  packagePath: string,
  packageJson: PackageJSON,
  newPackageVersions: { [key: string]: string },
) /*: Promise<void> */ {
  const packageName = packageJson.name;

  if (packageName in newPackageVersions) {
    packageJson.version = newPackageVersions[packageName];
  }

  for (const dependencyField of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
  ]) {
    const deps = packageJson[dependencyField];

    if (deps == null) {
      continue;
    }

    if (deps['react-native']) {
      delete deps['react-native'];
      deps[repoName] =
        dependencyField === 'peerDependencies' ? '*' : packageJson.version;
    }

    for (const dependency in newPackageVersions) {
      if (dependency in deps) {
        deps[dependency] = newPackageVersions[dependency];
      }
    }
  }

  return await writePackageJsonAsync(
    path.join(packagePath, 'package.json'),
    packageJson,
  );
}

/**
 * Write a `package.json` file to disk.
 */
async function writePackageJsonAsync(
  packageJsonPath: string,
  packageJson: PackageJSON,
) /*: Promise<void> */ {
  return await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
  );
}

/**
 * `package` is an object form of package.json
 * `dependencies` is a map of dependency to version string
 *
 * This replaces both dependencies and devDependencies in package.json
 */
export function applyPackageVersions(
  originalPackageJson: PackageJSON,
  packageVersions: { [key: string]: string },
) {
  const packageJson = { ...originalPackageJson };

  for (const name of Object.keys(packageVersions)) {
    if (
      packageJson.devDependencies != null &&
      packageJson.devDependencies[name] != null
    ) {
      packageJson.devDependencies[name] = packageVersions[name];
    } else {
      packageJson.dependencies[name] = packageVersions[name];
    }
  }
  return packageJson;
}
