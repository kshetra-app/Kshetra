import { extractContentHashtags } from '@kshetra/shared';

test('preserves marks in native tags and removes duplicates and punctuation', () => {
  expect(extractContentHashtags('#తెలుగు, #हिन्दी #தமிழ் #తెలుగు #English #english')).toEqual([
    'తెలుగు', 'हिन्दी', 'தமிழ்', 'english',
  ]);
});
