import { resolvePromiseScope } from '../lib/civicTypes';

describe('Civic Dashboard promise scope', () => {
  it('opens the selected state with or without a home constituency', () => {
    expect(resolvePromiseScope('TS', true, null)).toBe('state');
    expect(resolvePromiseScope('AP', false, null)).toBe('state');
  });

  it('keeps an explicit National or constituency choice for the same state', () => {
    expect(resolvePromiseScope('TS', true, { stateCode: 'TS', scope: 'national' })).toBe('national');
    expect(resolvePromiseScope('TS', true, { stateCode: 'TS', scope: 'constituency' })).toBe('constituency');
  });

  it('clears a mismatched scope when the user changes the active geography', () => {
    expect(resolvePromiseScope('AP', false, { stateCode: 'TS', scope: 'national' })).toBe('state');
    expect(resolvePromiseScope('TS', false, { stateCode: 'TS', scope: 'constituency' })).toBe('state');
    expect(resolvePromiseScope('IN', false, { stateCode: 'TS', scope: 'state' })).toBe('national');
  });
});
