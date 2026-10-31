import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import AdaptiveFloatingControls from '../components/AdaptiveFloatingControls';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: any, opts: any) => opts?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

jest.mock('../lib/haptics', () => ({
  tapLight: jest.fn(),
  selectionChanged: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

describe('<AdaptiveFloatingControls /> Component Behavioral Specs', () => {
  const defaultProps = {
    stateCode: 'IN',
    selectedConstituency: null,
    mapCompareActive: false,
    focusedDistrict: '',
    is3DMode: false,
    showDelimitation: false,
    locating: false,
    isImmersive: false,
    onOpenSearch: jest.fn(),
    onOpenCompare: jest.fn(),
    onReset: jest.fn(),
    onToggle3D: jest.fn(),
    onToggleDistrict: jest.fn(),
    onToggleDelimitation: jest.fn(),
    onLocateMe: jest.fn(),
  };

  it('renders only 3D View and Locate on National Overview (IN) to prevent map obstruction', () => {
    render(<AdaptiveFloatingControls {...defaultProps} stateCode="IN" />);

    // 3D View and Locate should be present
    expect(screen.getByText('3D View')).toBeTruthy();
    expect(screen.getByText('Locate')).toBeTruthy();

    // Constituency-level controls should NOT be visible on national overview
    expect(screen.queryByText('common.search')).toBeNull();
    expect(screen.queryByText('Compare')).toBeNull();
    expect(screen.queryByText('District')).toBeNull();
    expect(screen.queryByText('Density')).toBeNull();
    expect(screen.queryByText('Reset')).toBeNull();
  });

  it('renders full suite of controls on state overview (e.g. TS / AP)', () => {
    render(<AdaptiveFloatingControls {...defaultProps} stateCode="TS" />);

    // Search, Compare, Reset, 3D View, Density, Locate should be present
    expect(screen.getByText('common.search')).toBeTruthy();
    expect(screen.getByText('Compare')).toBeTruthy();
    expect(screen.getByText('Reset')).toBeTruthy();
    expect(screen.getByText('3D View')).toBeTruthy();
    expect(screen.getByText('Density')).toBeTruthy();
    expect(screen.getByText('Locate')).toBeTruthy();
  });

  it('renders District focus button when constituency is selected within state', () => {
    render(
      <AdaptiveFloatingControls
        {...defaultProps}
        stateCode="TS"
        selectedConstituency={{ acNo: 81, name: 'Nagarkurnool', district: 'Nagarkurnool' }}
      />
    );

    expect(screen.getByText('District')).toBeTruthy();
  });

  it('shows glowing reset button when 3D mode is active on National Overview', () => {
    render(<AdaptiveFloatingControls {...defaultProps} stateCode="IN" is3DMode={true} />);

    expect(screen.getByText('3D ON')).toBeTruthy();
    expect(screen.getByText('Reset')).toBeTruthy();
  });

  it('triggers onToggle3D when 3D button is pressed', () => {
    const onToggle3D = jest.fn();
    render(<AdaptiveFloatingControls {...defaultProps} onToggle3D={onToggle3D} />);

    const button3D = screen.getByText('3D View');
    fireEvent.press(button3D);
    expect(onToggle3D).toHaveBeenCalled();
  });

  it('triggers onLocateMe when Locate button is pressed', () => {
    const onLocateMe = jest.fn();
    render(<AdaptiveFloatingControls {...defaultProps} onLocateMe={onLocateMe} />);

    const locateBtn = screen.getByText('Locate');
    fireEvent.press(locateBtn);
    expect(onLocateMe).toHaveBeenCalled();
  });

  it('can toggle minimize to collapse into a single beacon and expand back', () => {
    render(<AdaptiveFloatingControls {...defaultProps} stateCode="IN" />);

    // Initially expanded
    expect(screen.getByText('3D View')).toBeTruthy();

    // Minimize via drag handle
    const minimizePill = screen.getByLabelText('Minimize Controls');
    fireEvent.press(minimizePill);

    // After minimize, 3D View text is hidden
    expect(screen.queryByText('3D View')).toBeNull();
    const expandBtn = screen.getByLabelText('Expand Controls');
    expect(expandBtn).toBeTruthy();

    // Expand again
    fireEvent.press(expandBtn);
    expect(screen.getByText('3D View')).toBeTruthy();
  });
});
