import { requireAuth } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  return <Shell user={user}>{children}</Shell>;
}
