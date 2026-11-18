import {
  homeConstituencyBelongsToState,
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
});
