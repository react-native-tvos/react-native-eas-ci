export type RepoConstants = {
  repoName: string;
  rnPackagePath: string;
  vlPackagePath: string;
  repoPath: string;
  repoUrl: string;
  repoBranch: string;
};

export type MavenConstants = {
  namespace: string;
  mavenArtifactsPath: string;
  mavenLocalPath: string;
  mavenLocalUrl: string;
  isSnapshot: boolean;
  releaseVersion: string;
  publishToSonatype: boolean;
  pushReleaseToRepo: boolean;
};

export type EasConstants = {
  buildDir: string;
  sourceDir: string;
  buildRunner: string;
  buildPlatform: string;
  isBuildLocal: boolean;
};

export type PackageJSON = {
  name: string;
  version: string;
  private?: boolean;
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
};

export type Version = {
  version: string;
  major: string;
  minor: string;
  patch: string;
  prerelease: string | null | undefined;
};

export type BuildType =
  | 'dry-run'
  | 'release'
  | 'nightly'
  | 'prealpha'
  | 'tvrelease';

export type PackagesFilter = {
  includeReactNative: boolean;
  includePrivate?: boolean;
};

export type PackageInfo = {
  // The name of the package
  name: string;

  // The version of the package
  version: string;

  // The absolute path to the package
  path: string;

  // The parsed package.json contents
  packageJson: PackageJSON;
};

export type ProjectInfo = {
  [packageName: string]: PackageInfo;
};
