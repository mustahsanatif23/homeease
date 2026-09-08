"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMessageAction } from "@/actions/message.actions";
import { initialActionState } from "@/actions/types";
import { SubmitButton } from "@/components/forms";
import type { ChatMessage } from "@/services/message.service";

const POLL_MS = 4000;
const MAX_LENGTH = 1000;

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today.getTime() - 86_400_000);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function Chat({
  bookingId, initialMessages, counterpart, closed = false, height = 330,
}: {
  bookingId: string;
  initialMessages: ChatMessage[];
  counterpart: string;
  closed?: boolean;
  height?: number;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [live, setLive] = useState(true);
  const [state, formAction] = useActionState(sendMessageAction, initialActionState);
  const listRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Poll for the other side's replies. Swapping this for a websocket would only
  // change this effect.
  useEffect(() => {
    if (closed) return;
    let cancelled = false;

    async function pull() {
      try {
        const response = await fetch(`/api/messages/${bookingId}`, { cache: "no-store" });
        if (!response.ok) throw new Error("poll failed");
        const data = (await response.json()) as { messages: ChatMessage[] };
        if (!cancelled) {
          setMessages(data.messages);
          setLive(true);
        }
      } catch {
        if (!cancelled) setLive(false);
      }
    }

    const id = setInterval(pull, POLL_MS);
    return () => { cancelled = true; clearInterval(id); };
  }, [bookingId, closed]);

  // Show a sent message immediately, without waiting for the next poll.
  useEffect(() => {
    const raw = state.data?.message;
    if (typeof raw !== "string") return;
    const sent = JSON.parse(raw) as ChatMessage;
    setMessages((current) => (current.some((m) => m.id === sent.id) ? current : [...current, sent]));
  }, [state]);

  useEffect(() => {
    const node = listRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  let lastDay = "";

  return (
    <div className="chat">
      <div className="row-between" style={{ marginBottom: 10 }}>
        <div>
          <div className="small strong">Chat with {counterpart}</div>
          <div className="tiny muted">
            {closed ? "This job is closed — the chat is read-only." : live ? "Live · updates every few seconds" : "Reconnecting…"}
          </div>
        </div>
        <span className={`badge ${closed ? "badge-muted" : live ? "badge-success" : "badge-warning"}`}>
          {closed ? "closed" : live ? "live" : "offline"}
        </span>
      </div>

      <div className="chat-list" ref={listRef} style={{ height }} aria-live="polite">
        {messages.length === 0 ? (
          <p className="tiny muted center" style={{ padding: 20 }}>
            No messages yet. Say hello, share a gate code, or ask a question.
          </p>
        ) : (
          messages.map((message) => {
            const day = dayLabel(message.createdAt);
            const showDay = day !== lastDay;
            lastDay = day;
            return (
              <div key={message.id}>
                {showDay ? <div className="chat-day">{day}</div> : null}
                <div className={`bubble ${message.mine ? "mine" : ""}`}>
                  {!message.mine ? <div className="who">{message.senderName}</div> : null}
                  <div>{message.body}</div>
                  <div className="when">{clock(message.createdAt)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {state.error ? <div className="alert alert-error" style={{ marginTop: 10 }}>{state.error}</div> : null}

      {closed ? null : (
        <form
          ref={formRef}
          action={(formData) => { formAction(formData); setDraft(""); }}
          className="chat-composer"
        >
          <input type="hidden" name="bookingId" value={bookingId} />
          <input
            name="body"
            className="input"
            placeholder={`Message ${counterpart}…`}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="Message"
          />
          <SubmitButton className="btn-sm" pendingText="Sending…" disabled={draft.trim().length === 0}>Send</SubmitButton>
        </form>
      )}
    </div>
  );
}
