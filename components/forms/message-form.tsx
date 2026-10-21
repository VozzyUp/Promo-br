"use client";

import { useActionState, useRef } from "react";
import { sendMessageAction, type MessageState } from "@/app/actions/social";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/field";

export function MessageForm({ to, label = "Escreva sua mensagem" }: { to: string; label?: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<MessageState, FormData>(async (prev, fd) => {
    const r = await sendMessageAction(prev, fd);
    if (r?.ok) formRef.current?.reset();
    return r;
  }, undefined);

  return (
    <form ref={formRef} action={action} className="flex flex-col gap-2">
      <input type="hidden" name="to" value={to} />
      <label htmlFor={`msg-${to}`} className="sr-only">{label}</label>
      <textarea
        id={`msg-${to}`}
        name="body"
        required
        maxLength={2000}
        rows={3}
        placeholder={label}
        className="w-full resize-y rounded-sm border border-border-input bg-bg px-3 py-2 text-base"
      />
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      {state?.ok ? <FormMessage tone="success">Mensagem enviada.</FormMessage> : null}
      <div><Button type="submit" loading={pending}>Enviar</Button></div>
    </form>
  );
}
