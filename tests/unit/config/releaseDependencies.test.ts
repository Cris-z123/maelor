import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

type PackageManifest = {
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

function readPackageManifest(): PackageManifest {
  const manifestPath = path.resolve(process.cwd(), 'package.json');
  const manifest = readFileSync(manifestPath, 'utf8');

  return JSON.parse(manifest) as PackageManifest;
}

describe('release dependency manifest', () => {
  it('ships PST parsing dependencies as production dependencies', () => {
    const manifest = readPackageManifest();

    expect(manifest.dependencies?.['pst-extractor']).toBeDefined();
    expect(manifest.dependencies?.long).toBeDefined();
    expect(manifest.optionalDependencies?.['pst-extractor']).toBeUndefined();
  });
});
