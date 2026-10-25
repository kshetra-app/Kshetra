/**
 * Isolated identity validator for API route unit tests.
 * Never loaded by production runtime; Jest alone enables TEST_HARNESS_ACTIVE.
 */
process.env.TEST_HARNESS_ACTIVE = 'true';

import { setTestTokenValidator } from '../lib/userAuth';

setTestTokenValidator((token, request) => {
  const prefix = 'test-harness:';
  if (!token.startsWith(prefix)) return null;
  const id = token.slice(prefix.length).trim();
  if (!id) return null;
  const roleHeader = request.headers['x-test-role'] ?? request.headers['x-user-role'];
  const role = typeof roleHeader === 'string' ? roleHeader : 'citizen';
  return { id, role };
});
