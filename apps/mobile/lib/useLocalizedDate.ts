import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

const LOCALE_MAP: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  kn: 'kn-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  ml: 'ml-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  pa: 'pa-IN',
  or: 'or-IN',
  as: 'as-IN',
  ne: 'ne-IN',
};

export function useLocalizedDate() {
  const { i18n } = useTranslation();
  const locale = LOCALE_MAP[i18n.language] || 'en-IN';

  const formatDate = useCallback(
    (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
      return d.toLocaleDateString(locale, options);
    },
    [locale]
  );

  const formatNumber = useCallback(
    (num: number): string => {
      return num.toLocaleString(locale);
    },
    [locale]
  );

  return { formatDate, formatNumber, locale };
}
