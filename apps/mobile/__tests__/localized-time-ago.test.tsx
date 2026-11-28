import { renderHook } from '@testing-library/react-native';
import i18next from 'i18next';
import { createElement, type PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import te from '../i18n/locales/te';
import { useTimeAgo } from '../lib/useTimeAgo';

test('relative timestamps use app language and keep older dates readable', async () => {
  const i18n = i18next.createInstance();
  await i18n.init({ lng: 'te', resources: { te: { translation: te } } });
  const now = Date.parse('2026-11-28T14:30:00Z');
  const clock = jest.spyOn(Date, 'now').mockReturnValue(now);
  try {
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(I18nextProvider, { i18n, children });
    const { result } = renderHook(() => useTimeAgo(true), { wrapper });

    expect(result.current.timeAgo(now - 180_000)).toBe('3 నిమిషాల క్రితం');
    expect(result.current.timeAgo('invalid timestamp')).toBe('');

    const older = new Date('2026-11-18T12:00:00Z');
    expect(result.current.timeAgo(older)).toBe(
      older.toLocaleDateString('te-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    );
  } finally {
    clock.mockRestore();
  }
});
