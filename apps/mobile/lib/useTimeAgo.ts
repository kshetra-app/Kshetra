import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useLocalizedDate } from './useLocalizedDate';

export function useTimeAgo(calendarAfterWeek = false) {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();

  const timeAgo = useCallback((date: Date | string | number): string => {
    const now = Date.now();
    const then = typeof date === 'string' || typeof date === 'number' ? new Date(date).getTime() : date.getTime();
    if (!Number.isFinite(then)) return '';
    const diffMs = now - then;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);
    const diffWeek = Math.floor(diffDay / 7);

    if (diffMin < 1) return t('common.timeAgo.justNow');
    if (diffMin < 60) return t('common.timeAgo.minutesAgo', { n: diffMin });
    if (diffHr < 24) return t('common.timeAgo.hoursAgo', { n: diffHr });
    if (diffDay < 7) return t('common.timeAgo.daysAgo', { n: diffDay });
    if (calendarAfterWeek) return formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' });
    return t('common.timeAgo.weeksAgo', { n: diffWeek });
  }, [calendarAfterWeek, formatDate, t]);

  return { timeAgo };
}
