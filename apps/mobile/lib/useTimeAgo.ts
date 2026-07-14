import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export function useTimeAgo() {
  const { t } = useTranslation();

  const timeAgo = useCallback((date: Date | string | number): string => {
    const now = Date.now();
    const then = typeof date === 'string' || typeof date === 'number' ? new Date(date).getTime() : date.getTime();
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffMin < 1) return t('common.timeAgo.justNow');
    if (diffMin < 60) return t('common.timeAgo.minutesAgo', { n: diffMin });
    if (diffHr < 24) return t('common.timeAgo.hoursAgo', { n: diffHr });
    if (diffDay < 7) return t('common.timeAgo.daysAgo', { n: diffDay });
    return t('common.timeAgo.weeksAgo', { n: diffWeek });
  }, [t]);

  return { timeAgo };
}
