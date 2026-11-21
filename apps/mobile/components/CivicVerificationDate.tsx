import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalizedDate } from '../lib/useLocalizedDate';

export default function CivicVerificationDate({
  date,
  style,
}: {
  date?: string;
  style?: StyleProp<TextStyle>;
}) {
  const { t } = useTranslation();
  const { formatDate } = useLocalizedDate();
  if (!date) return null;

  return (
    <Text style={[styles.date, style]}>
      {t('civicMetrics.sourceVerifiedOn', {
        date: formatDate(date, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }),
      })}
    </Text>
  );
}

const styles = StyleSheet.create({
  date: { color: '#6D5549', fontSize: 13, marginTop: 6 },
});
