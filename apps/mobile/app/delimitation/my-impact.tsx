import { Redirect } from 'expo-router';

export default function DelimitationImpactRedirect() {
  return <Redirect href={{ pathname: '/delimitation', params: { tab: 'impact' } }} />;
}
