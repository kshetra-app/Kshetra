import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import DiscoveryHubSheet from '../components/DiscoveryHubSheet';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: any, opts: any) => opts?.defaultValue || key,
    i18n: { language: 'en' },
  }),
}));

describe('<DiscoveryHubSheet />', () => {
  it('renders nothing when visible is false', () => {
    render(<DiscoveryHubSheet visible={false} onClose={jest.fn()} />);
    expect(screen.queryByText('POLIGRAM Discovery & Guide')).toBeNull();
  });

  it('renders goal cards and title when visible is true', () => {
    const onClose = jest.fn();
    render(<DiscoveryHubSheet visible={true} onClose={onClose} initialSection="goals" />);

    expect(screen.getByText('POLIGRAM Discovery & Guide')).toBeTruthy();
    expect(screen.getByText('What would you like to do?')).toBeTruthy();
    expect(screen.getByText('Goals')).toBeTruthy();
    expect(screen.getByText('Features')).toBeTruthy();
    expect(screen.getByText('Page Help')).toBeTruthy();
  });

  it('switches between tabs cleanly without crashing', () => {
    const onClose = jest.fn();
    render(<DiscoveryHubSheet visible={true} onClose={onClose} initialSection="goals" />);

    // Click Features tab
    const featuresTab = screen.getByText('Features');
    fireEvent.press(featuresTab);
    expect(screen.getByText('Feature Directory')).toBeTruthy();

    // Click Page Help tab
    const helpTab = screen.getByText('Page Help');
    fireEvent.press(helpTab);
    expect(screen.getByText('Current Screen')).toBeTruthy();
  });

  it('calls onClose when close button is pressed', () => {
    const onClose = jest.fn();
    render(<DiscoveryHubSheet visible={true} onClose={onClose} />);

    const closeBtn = screen.getByLabelText('Close');
    fireEvent.press(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
