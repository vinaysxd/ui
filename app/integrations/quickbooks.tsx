import { Redirect } from "expo-router";

// Landing route for the brothers://integrations/quickbooks deep link fired after OAuth.
export default function QuickBooksCallbackRoute() {
  return <Redirect href="/(admin)/settings" />;
}
