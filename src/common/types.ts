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
};

export type EasConstants = {
  buildDir: string;
  sourceDir: string;
  buildRunner: string;
  buildPlatform: string;
  isBuildLocal: boolean;
};
