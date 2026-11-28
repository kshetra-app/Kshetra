import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scanScreenCopy } from '../scripts/scan-hardcoded-strings.mjs';

test('the screen copy scan catches visible labels, navigation and alerts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'poligram-localization-test-'));
  try {
    const routes = path.join(root, 'apps', 'mobile', 'app');
    await mkdir(routes, { recursive: true });
    await mkdir(path.join(root, 'apps', 'mobile', 'components'));
    await writeFile(path.join(routes, 'example.tsx'), `
      const Example = () => <>
        <Stack.Screen options={{ title: 'Representative' }} />
        <TextInput placeholder={t('common.search')} />
        <Text>Search here</Text>
        <Text>&gt;20%</Text>
        <Text>{loading ? 'Please wait' : t('common.loaded')}</Text>
        <Button onPress={() => Alert.alert('Load failed', t('common.retry'))} />
      </>;
    `);
    const { files, findings } = scanScreenCopy(root);
    assert.equal(files, 1);
    assert.deepEqual(
      findings.map(({ kind, text }) => [kind, text]),
      [
        ['navigation', 'Representative'],
        ['text', 'Search here'],
        ['expression', 'Please wait'],
        ['alert', 'Load failed'],
      ],
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
