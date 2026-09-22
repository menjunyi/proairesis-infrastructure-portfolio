import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { manifest, verifyPromotion } from '../scripts/artifact.mjs';

const source = 'a'.repeat(40);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(join(root, 'index.html'), '<h1>Demo</h1>');
  const expected = await manifest(root, source);
  const receipt = { source, digest: expected.digest, environment: 'staging', passed: true };
  return { root, expected, receipt };
}
test('identical staged artifact is eligible for promotion', async t => {
  const { root, expected, receipt } = await fixture(t);
  assert.deepEqual(await verifyPromotion(root, expected, receipt, source), expected);
});
test('changed bytes fail promotion', async t => {
  const { root, expected, receipt } = await fixture(t);
  await writeFile(join(root, 'index.html'), 'changed');
  await assert.rejects(verifyPromotion(root, expected, receipt, source));
});
test('additional files fail promotion', async t => {
  const { root, expected, receipt } = await fixture(t);
  await writeFile(join(root, 'extra.html'), 'extra');
  await assert.rejects(verifyPromotion(root, expected, receipt, source));
});
test('wrong source, failed staging, wrong environment and digest fail closed', async t => {
  const { root, expected, receipt } = await fixture(t);
  for (const delta of [{ source: 'b'.repeat(40) }, { passed: false }, { environment: 'production' }, { digest: 'wrong' }]) {
    await assert.rejects(verifyPromotion(root, expected, { ...receipt, ...delta }, source));
  }
  await assert.rejects(verifyPromotion(root, expected, receipt, 'b'.repeat(40)));
});
test('symlink entries and invalid source are rejected', async t => {
  const { root } = await fixture(t);
  await symlink('index.html', join(root, 'alias.html'));
  await assert.rejects(manifest(root, source));
  await assert.rejects(manifest(root, 'main'));
});
