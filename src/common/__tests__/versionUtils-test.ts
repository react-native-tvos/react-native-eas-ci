import { parseVersion } from '../versionUtils';

describe('parseVersion tests', () => {
  test('Works on core as expected', () => {
    const version = parseVersion('0.75.2', 'release');
    expect(version.major).toEqual('0');
    expect(version.minor).toEqual('75');
    expect(version.prerelease).toBeUndefined();
  });
  test('Handles errors on core versions', () => {
    try {
      parseVersion('0.75.2', 'prealpha');
      throw new Error('parseVersion should have thrown');
    } catch (e) {
      expect(`${e}`).toEqual(
        'Error: Version 0.75.2 is not valid for prealphas',
      );
    }
  });
  test('Works on TV as expected', () => {
    const version = parseVersion('0.75.2-0', 'tvrelease');
    expect(version.major).toEqual('0');
    expect(version.minor).toEqual('75');
    expect(version.prerelease).toEqual('0');
  });
});
