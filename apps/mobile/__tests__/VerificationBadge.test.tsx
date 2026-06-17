/**
 * Component test for VerificationBadge — exercises the jest-expo +
 * React Native Testing Library harness (render + query assertions).
 */
import { render, screen } from '@testing-library/react-native';
import VerificationBadge from '../components/VerificationBadge';

describe('<VerificationBadge />', () => {
  it('renders the role label in full mode', () => {
    render(<VerificationBadge role="journalist" />);
    expect(screen.getByText('Journalist')).toBeOnTheScreen();
  });

  it('renders nothing for an unverified citizen', () => {
    render(<VerificationBadge role="citizen" />);
    expect(screen.queryByText('Citizen')).toBeNull();
  });

  it('renders the admin label', () => {
    render(<VerificationBadge role="admin" isVerified />);
    expect(screen.getByText('Admin')).toBeOnTheScreen();
  });

  it('omits the text label in compact mode', () => {
    render(<VerificationBadge role="politician" compact />);
    // Compact mode shows only icons, no role label text.
    expect(screen.queryByText('Politician')).toBeNull();
  });
});
