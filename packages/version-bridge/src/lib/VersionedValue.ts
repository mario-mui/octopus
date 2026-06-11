/**
 * The versioned value interface is a container for a set of values that
 * can be looked up by version. It is intended to be used as a container
 * for values that can be versioned independently of package versions.
 *
 * @public
 */
export type VersionedValue<Versions extends { [version: number]: unknown }> = {
  atVersion<Version extends keyof Versions>(
    version: Version,
  ): Versions[Version] | undefined;
};

/**
 * Creates a container for a map of versioned values that implements VersionedValue.
 *
 * @public
 */
export function createVersionedValueMap<
  Versions extends { [version: number]: unknown },
>(versions: Versions): VersionedValue<Versions> {
  Object.freeze(versions);
  const versionedValue: VersionedValue<Versions> = {
    atVersion(version) {
      return versions[version];
    },
  };
  Object.defineProperty(versionedValue, '$map', {
    configurable: true,
    enumerable: true,
    get() {
      return versions;
    },
  });
  return versionedValue;
}
