import { Redirect } from 'expo-router';

/** financial-tools.tsx redirects to the existing financial.tsx route for backward compat. */
export default function FinancialToolsRoute() {
  return <Redirect href="/financial" />;
}
