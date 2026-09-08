import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getThread } from "@/services/message.service";
import { toUserMessage } from "@/lib/errors";

export const dynamic = "force-dynamic";

/**
 * Poll endpoint for the chat widget. The thread itself is access-checked in the
 * service, so a booking id from the browser gets a 403 rather than data.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  try {
    const thread = await getThread(bookingId, user.id, user.role);
    return NextResponse.json(thread);
  } catch (error) {
    return NextResponse.json({ error: toUserMessage(error) }, { status: 403 });
  }
}
