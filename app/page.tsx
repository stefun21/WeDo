import AuthScreen from "./auth-screen";
import Dashboard from "./dashboard";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthScreen />;
  }

  return <Dashboard user={{ username: user.username, displayName: user.displayName }} />;
}
