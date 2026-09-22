import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findings } from '../scripts/privacy-check.mjs';

test('private account numbers are blocked; documented placeholder is allowed', () => {
  assert.ok(findings('main.tf', ['987654', '321098'].join('')).length);
  assert.deepEqual(findings('main.tf', '123456789012'), []);
});
test('integration endpoints and personal paths are blocked without real fixtures', () => {
  assert.ok(findings('main.tf', ['https:', '//script.google.com', '/macros/s/example/exec'].join('')).length);
  assert.ok(findings('readme.md', ['/Users', '/someone', '/project'].join('')).length);
});
test('private state/config files fail, example variables pass', () => {
  for (const path of ['terraform.tfvars', '.env', 'terraform.tfstate', 'backend.hcl', 'private.key']) assert.ok(findings(path, '').length);
  assert.deepEqual(findings('terraform.tfvars.example', 'example.com'), []);
});
test('named IAM users and concrete trust subjects are blocked', () => {
  assert.ok(findings('main.tf', ['arn:aws:iam::123456789012:', 'user/', 'operator'].join('')).length);
  assert.ok(findings('main.tf', ['repo:', 'private-owner/project', ':environment:staging'].join('')).length);
  assert.deepEqual(findings('main.tf', 'repo:example/portfolio:environment:staging'), []);
});
test('workflow privilege escalation and extra workflows fail closed', () => {
  const path = '.github/workflows/validate.yml';
  const safe = 'permissions:\n  contents: read\njobs:\n';
  assert.deepEqual(findings(path, safe), []);
  for (const unsafe of ['id-token: write', 'environment: production', 'secrets.AWS_KEY', 'runs-on: self-hosted', 'terraform apply']) assert.ok(findings(path, safe + unsafe).length);
  assert.ok(findings('.github/workflows/deploy.yml', safe).length);
});
