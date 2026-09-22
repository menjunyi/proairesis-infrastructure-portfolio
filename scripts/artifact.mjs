import { createHash } from 'node:crypto';
import { readFile, readdir, lstat } from 'node:fs/promises';
import { join } from 'node:path';

// Small portfolio adaptation of the production checksummed-release contract.
export async function manifest(root, source) {
  if (!/^[a-f0-9]{40}$/.test(source)) throw Error('Expected a full source commit SHA');
  const files = {};
  async function walk(relative = '') {
    for (const name of (await readdir(join(root, relative))).sort()) {
      const path = relative ? `${relative}/${name}` : name;
      const stat = await lstat(join(root, path));
      if (stat.isSymbolicLink()) throw Error('Symlinks are not release artifacts');
      if (stat.isDirectory()) await walk(path);
      else if (stat.isFile()) files[path] = createHash('sha256').update(await readFile(join(root, path))).digest('hex');
      else throw Error('Unsupported artifact entry');
    }
  }
  await walk();
  if (!Object.keys(files).length) throw Error('Empty artifact');
  const digest = createHash('sha256').update(JSON.stringify({ source, files })).digest('hex');
  return { source, files, digest };
}

export async function verifyPromotion(root, expected, receipt, source) {
  const actual = await manifest(root, source);
  if (actual.digest !== expected.digest || expected.source !== source ||
      receipt.source !== source || receipt.digest !== actual.digest ||
      receipt.environment !== 'staging' || receipt.passed !== true) {
    throw Error('Artifact or staging evidence mismatch');
  }
  return actual;
}
