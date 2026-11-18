import React from 'react';
import { render } from '@testing-library/react-native';
import CandidateAvatar from '../components/CandidateAvatar';

jest.mock('../lib/candidatePhotos', () => ({
  fetchWikipediaPhoto: jest.fn().mockResolvedValue('https://example.invalid/wikipedia-photo.jpg'),
  getCachedPhoto: jest.fn().mockReturnValue('https://example.invalid/cached-photo.jpg'),
  getSmartInitials: jest.fn().mockReturnValue('TR'),
  getStaticPhoto: jest.fn().mockReturnValue('https://example.invalid/name-map-photo.jpg'),
  hasKnownPhoto: jest.fn().mockReturnValue(true),
}));

describe('CandidateAvatar photo provenance', () => {
  it('shows initials instead of an unverified name or cache match when fallback is disabled', () => {
    const { getByText, queryByTestId } = render(
      <CandidateAvatar name="T. Raja Singh" party="BJP" size={40} allowUnverifiedFallback={false} />,
    );

    expect(getByText('TR')).toBeTruthy();
    expect(queryByTestId('candidate-avatar-photo')).toBeNull();
  });

  it('renders an explicit election-record photo when fallback is disabled', () => {
    const photoUrl =
      'https://results.eci.gov.in/uploads1/candprofile/E22/2023/AC/s29/TRAJ-2023-20231104014656.jpg';
    const { getByTestId } = render(
      <CandidateAvatar
        name="T. Raja Singh"
        party="BJP"
        size={40}
        photoUrl={photoUrl}
        allowUnverifiedFallback={false}
      />,
    );

    expect(getByTestId('candidate-avatar-photo').props.source.uri).toBe(photoUrl);
  });
});
