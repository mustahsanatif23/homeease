import { logoutAction } from "@/actions/auth.actions";
import { SubmitButton } from "@/components/forms";

export default function LogoutButton({ className = "btn-secondary btn-sm" }: { className?: string }) {
  return (
    <form action={logoutAction}>
      <SubmitButton className={className} pendingText="Signing out…">Log out</SubmitButton>
    </form>
  );
}
