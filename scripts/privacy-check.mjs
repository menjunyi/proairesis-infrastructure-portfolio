import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Generic rules avoid publishing the private identifiers they are designed to block.
export function findings(path, text) {
  const errors = [];
  if (/(^|\/)(\.env(?:\..*)?|backend\.hcl|.*\.tfvars(?:\.json)?|.*\.tfstate(?:\..*)?|.*\.tfplan|.*\.(?:pem|key|sqlite|db))$/.test(path) && !path.endsWith('.example')) errors.push('private configuration file');
  if (/(^|\/)(\.local|\.terraform|node_modules)\//.test(path)) errors.push('local/generated directory');
  if (/(?<![A-Za-z0-9])[0-9]{12}(?![A-Za-z0-9])/.test(text.replaceAll('123456789012', 'EXAMPLE_ACCOUNT'))) errors.push('non-example 12-digit account identifier');
  if (/https?:\/\/script\.google\.com\/macros\/s\//i.test(text)) errors.push('Google integration endpoint');
  if (/arn:aws[^:]*:iam::[^\s"']+:user\//.test(text)) errors.push('named IAM user');
  if (/\/Users\/[A-Za-z0-9_.-]+\//.test(text)) errors.push('personal filesystem path');
  if (/https?:\/\/[^\s"'<>]*proairesis\.digital\b/i.test(text)) errors.push('live company endpoint');
  for (const match of text.matchAll(/repo:([A-Za-z0-9_.@-]+\/[A-Za-z0-9_.@-]+):environment:/g)) {
    if (match[1] !== 'example/portfolio') errors.push('hard-coded repository trust subject');
  }
  if (path.startsWith('.github/workflows/')) {
    if (path !== '.github/workflows/validate.yml') errors.push('unreviewed workflow file');
    if (/id-token\s*:|\bwrite\b|secrets\s*[.\[]|pull_request_target|self-hosted|configure-aws-credentials|role-to-assume|^\s*environment\s*:|terraform[^\n]*\bapply\b/im.test(text)) errors.push('deployment or privileged workflow configuration');
    if (!/^permissions:\s*\n\s+contents: read\s*$/m.test(text)) errors.push('missing explicit read-only permissions');
  }
  return [...new Set(errors)];
}

function git(...args) { return execFileSync('git', args, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }); }
export function scan() {
  const failures = [];
  let count = 0;
  const revisions = git('rev-list', '--all').trim().split('\n').filter(Boolean);
  for (const revision of revisions) {
    for (const path of git('ls-tree', '-r', '--name-only', revision).trim().split('\n').filter(Boolean)) {
      count++;
      const errors = findings(path, git('show', `${revision}:${path}`));
      if (errors.length) failures.push(`${revision.slice(0, 8)}:${path}: ${errors.join(', ')}`);
    }
  }
  // Also inspect staged content, including not-yet-committed additions.
  for (const path of git('ls-files').trim().split('\n').filter(Boolean)) {
    const errors = findings(path, git('show', `:${path}`));
    if (errors.length) failures.push(`index:${path}: ${errors.join(', ')}`);
  }
  if (failures.length) throw Error(`Privacy policy failed (values withheld):\n${failures.join('\n')}`);
  console.log(`Privacy policy passed: ${revisions.length} commits, ${count} historical files, plus index. No cloud calls.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { scan(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
