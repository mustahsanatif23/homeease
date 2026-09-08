import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import Shell from "@/components/Shell";

export default async function ProviderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("PROVIDER");
  if (user.verificationStatus !== "APPROVED") redirect("/provider/pending");
  return <Shell user={user}>{children}</Shell>;
}
