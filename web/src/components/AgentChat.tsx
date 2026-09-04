import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, SendHorizontal } from "lucide-react";
import { askAgent } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import type { Identity } from "../types";

type ChatMessage = {
  id: number;
  role: "user" | "agent";
  text: string;
};

export function AgentChat({ identity }: { identity: Identity }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "agent",
      text: "Good day."
    }
  ]);

  const examples = useMemo(
    () => ["When is my next class?", "Which labs have a projector?", "Register me for the Guest Lecture"],
    []
  );

  const mutation = useMutation({
    mutationFn: askAgent,
    onSuccess: (response) => {
      setMessages((current) => [...current, { id: Date.now() + 1, role: "agent", text: response.message }]);
      Object.values(queryKeys).forEach((queryKey) => {
        void queryClient.invalidateQueries({ queryKey });
      });
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "agent",
          text: error instanceof Error ? error.message : "I could not complete that request."
        }
      ]);
    }
  });

  function send(message = input) {
    const trimmed = message.trim();
    if (!trimmed || mutation.isPending) {
      return;
    }
    setMessages((current) => [...current, { id: Date.now(), role: "user", text: trimmed }]);
    setInput("");
    mutation.mutate(trimmed);
  }

  return (
    <div className="flex min-h-[360px] flex-1 flex-col rounded-lg border border-black/10 bg-white">
      <div className="border-b border-black/10 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-normal text-black/45">Live assistant</p>
        <p className="mt-1 text-sm font-semibold text-black">{identity.name}</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-lg px-3 py-2 text-sm leading-5 ${
              message.role === "user"
                ? "ml-auto bg-[#0075de] text-white"
                : "border border-black/10 bg-[#f6f5f4] text-black/75"
            }`}
          >
            <p className="whitespace-pre-line">{message.text}</p>
          </div>
        ))}
        {mutation.isPending ? (
          <div className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-[#f6f5f4] px-3 py-2 text-sm text-black/55">
            <Loader2 className="h-4 w-4 animate-spin text-[#0075de]" aria-hidden="true" />
            Thinking
          </div>
        ) : null}
      </div>

      <div className="border-t border-black/10 p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {examples.map((example) => (
            <button
              key={example}
              type="button"
              className="rounded-full bg-[#e6f3fe] px-3 py-1 text-xs font-medium text-[#0075de] transition duration-200 hover:bg-[#d8ecfe]"
              onClick={() => send(example)}
            >
              {example}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <input
            className="h-10 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#f6f5f4] px-3 text-sm text-black outline-none transition duration-200 placeholder:text-black/35 focus:border-[#0075de] focus:bg-white"
            placeholder="Ask CampusOS"
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
          <button
            type="submit"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0075de] text-white transition duration-200 hover:bg-[#0063bd] disabled:opacity-60"
            disabled={!input.trim() || mutation.isPending}
            title="Send"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
      </div>
    </div>
  );
}
