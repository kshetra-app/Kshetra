import {
  homeConstituencyBelongsToState,
  resolveConstituencyForState,
  useMyConstituencyStore,
} from '../stores/myConstituency';

describe('My constituency state scoping', () => {
  afterEach(() => {
    useMyConstituencyStore.getState().clearHome();
  });

  it('matches a home constituency by both state and assembly number', () => {
    useMyConstituencyStore.getState().setHome({
      stateCode: 'OD',
      acNo: 1,
      name: 'Balikuda-Erasama',
      district: 'Jagatsinghpur',
      party: '',
    });

    const store = useMyConstituencyStore.getState();
    expect(store.isHome('OD', 1)).toBe(true);
    expect(store.isHome('TS', 1)).toBe(false);
  });

  it('does not assign a legacy home record to a state by assembly number alone', () => {
    useMyConstituencyStore.getState().setHome({
      acNo: 1,
      name: 'Balikuda-Erasama',
      district: 'Jagatsinghpur',
      party: '',
    });

    expect(useMyConstituencyStore.getState().isHome('TS', 1)).toBe(false);
  });

  it('matches a legacy home only when number, name, and district all match', () => {
    const home = {
      acNo: 1,
      name: 'Balikuda-Erasama',
      district: 'Jagatsinghpur',
      party: '',
    };
    const odishaDirectory = [
      { acNo: 1, name: 'Balikuda-Erasama', district: 'Jagatsinghpur' },
    ];
    const telanganaDirectory = [
      { acNo: 1, name: 'Sirpur', district: 'Komaram Bheem Asifabad' },
    ];

    expect(homeConstituencyBelongsToState(home, 'OD', odishaDirectory)).toBe(true);
    expect(homeConstituencyBelongsToState(home, 'TS', telanganaDirectory)).toBe(false);
    expect(homeConstituencyBelongsToState(home, 'IN', odishaDirectory)).toBe(false);
  });

  it('does not combine an Odisha saved constituency with the active Telangana state', () => {
    const home = {
      stateCode: 'OD',
      acNo: 1,
      name: 'Balikuda-Erasama',
      district: 'Jagatsinghpur',
      party: '',
    };
    const telanganaDirectory = [
      { acNo: 1, name: 'Sirpur', district: 'Komaram Bheem Asifabad' },
    ];

    expect(
      resolveConstituencyForState(
        'TS',
        { id: 'OD-AC-1', name: 'Balikuda-Erasama' },
        home,
        telanganaDirectory,
      ),
    ).toBeNull();
    expect(resolveConstituencyForState('TS', null, home, telanganaDirectory)).toBeNull();
  });

  it('uses the selected state directory name and identity for a valid composer target', () => {
    const telanganaDirectory = [
      { acNo: 1, name: 'Sirpur', district: 'Komaram Bheem Asifabad' },
    ];

    expect(
      resolveConstituencyForState(
        'TS',
        { id: 'TS-AC-1', name: 'stale display name' },
        null,
        telanganaDirectory,
      ),
    ).toEqual({ acNo: 1, name: 'Sirpur' });
  });
});
