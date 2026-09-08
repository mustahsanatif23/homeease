"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { sendMessage } from "@/services/message.service";
import { toUserMessage } from "@/lib/errors";
import type { ActionState } from "@/actions/types";

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireAuth();
  const bookingId = String(formData.get("bookingId") ?? "");
  const body = String(formData.get("body") ?? "");

  try {
    const message = await sendMessage({ bookingId, senderId: user.id, role: user.role, body });
    revalidatePath("/messages");
    revalidatePath("/provider/messages");
    return { ok: true, data: { message: JSON.stringify(message) } };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
