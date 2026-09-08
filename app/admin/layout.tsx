import { requireRole } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ADMIN");
  return <Shell user={user}>{children}</Shell>;
}
