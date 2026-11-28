import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const isCommit = /^[a-f0-9]{40}$/;

export function verifyCheckoutLineage() {
  const head = git('rev-parse', 'HEAD');
  const event = process.env.GITHUB_EVENT_NAME;
  assert.match(head, isCommit);

  if (event === 'pull_request' || event === 'push') {
    assert.strictEqual(head, process.env.GITHUB_SHA, 'Checkout must match the workflow SHA');
    const payload = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    if (event === 'pull_request') {
      const { base, head: proposed } = payload.pull_request;
      assert.match(base.sha, isCommit);
      assert.match(proposed.sha, isCommit);
      assert.deepEqual(
        git('rev-list', '--parents', '-n', '1', 'HEAD').split(' '),
        [head, base.sha, proposed.sha],
        'The checked-out merge must have the exact base and head commits from the pull request',
      );
    } else {
      assert.strictEqual(payload.ref, process.env.GITHUB_REF, 'Push event branch must match the workflow ref');
      assert.strictEqual(payload.after, head, 'Checkout must match the commit recorded by the push event');
    }
    return head;
  }

  const upstream = git('rev-parse', '--symbolic-full-name', '@{upstream}');
  assert.strictEqual(head, git('rev-parse', upstream), `Local HEAD must match its published upstream ${upstream}`);
  return head;
}
