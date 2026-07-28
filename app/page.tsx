import AuthScreen from "./auth-screen";
import Dashboard from "./dashboard";
import { getCurrentUser } from "@/lib/auth";
import { getUserGroups } from "@/lib/groups";
import GroupSetup from "./group-setup";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthScreen />;
  }

  const groups = await getUserGroups(user.id);
  if (!groups.length) {
    return <GroupSetup displayName={user.displayName} />;
  }

  return <Dashboard user={{ username: user.username, displayName: user.displayName }} groups={groups} />;
}
