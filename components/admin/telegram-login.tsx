"use client";
import { useActionState } from "react";
import { useKeepForm } from "./use-keep-form";
import { telegramCodeAction, telegramLogoutAction, telegramPasswordAction, telegramStartAction, type LoginState } from "@/app/actions/sources";
import type { AccountStatus } from "@/lib/sources/telegram-account";

const input = "h-10 w-full rounded-sm border border-border-input bg-bg px-2 text-sm";
const button = "h-10 rounded-pill bg-accent px-5 text-sm font-bold text-on-accent hover:bg-accent-hover disabled:opacity-50";

function Status({ state }: { state: LoginState }) {
  return <p role="status" className={`text-sm ${state?.error ? "text-danger" : "text-muted"}`}>{state?.error ?? ""}</p>;
}

/** Login em 3 passos: credenciais da API e telefone, código do Telegram e (se houver) senha de duas etapas. */
export function TelegramLogin({ status }: { status: AccountStatus }) {
  const [startState, start, starting] = useActionState<LoginState, FormData>(telegramStartAction, undefined);
  const [codeState, sendCode, sendingCode] = useActionState<LoginState, FormData>(telegramCodeAction, undefined);
  const [passState, sendPass, sendingPass] = useActionState<LoginState, FormData>(telegramPasswordAction, undefined);
  const submitStart = useKeepForm(start);

  if (status.connected) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm">Conectada como <strong>{status.account}</strong>. Só leitura: o site nunca envia mensagens por esta conta.</p>
        <form action={telegramLogoutAction}>
          <button type="submit" className="h-9 rounded-pill border border-danger px-4 text-sm font-bold text-danger hover:bg-surface">Desconectar</button>
        </form>
      </div>
    );
  }

  if (status.needsPassword) {
    return (
      <form action={sendPass} className="flex flex-col gap-2 md:flex-row md:items-end">
        <div className="flex-1">
          <label htmlFor="tg-pass" className="mb-1 block text-sm font-bold">Senha de duas etapas do Telegram</label>
          <input id="tg-pass" name="password" type="password" autoComplete="off" required className={input} />
        </div>
        <button type="submit" disabled={sendingPass} className={button}>{sendingPass ? "Entrando…" : "Entrar"}</button>
        <Status state={passState} />
      </form>
    );
  }

  if (status.waitingCode) {
    return (
      <div className="flex flex-col gap-3">
        <form action={sendCode} className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="flex-1">
            <label htmlFor="tg-code" className="mb-1 block text-sm font-bold">Código que chegou no Telegram de {status.phone}</label>
            <input id="tg-code" name="code" inputMode="numeric" autoComplete="one-time-code" required className={input} />
          </div>
          <button type="submit" disabled={sendingCode} className={button}>{sendingCode ? "Conferindo…" : "Confirmar código"}</button>
          <Status state={codeState} />
        </form>
        <form action={telegramLogoutAction}>
          <button type="submit" className="text-sm font-bold text-accent hover:underline">Começar de novo</button>
        </form>
      </div>
    );
  }

  return (
    <form onSubmit={submitStart} className="grid gap-3 md:grid-cols-3">
      <div>
        <label htmlFor="tg-id" className="mb-1 block text-sm font-bold">api_id</label>
        <input id="tg-id" name="apiId" inputMode="numeric" required defaultValue={status.apiId ?? ""} className={input} />
      </div>
      <div>
        <label htmlFor="tg-hash" className="mb-1 block text-sm font-bold">api_hash</label>
        <input id="tg-hash" name="apiHash" autoComplete="off" required className={input} />
      </div>
      <div>
        <label htmlFor="tg-phone" className="mb-1 block text-sm font-bold">Telefone da conta</label>
        <input id="tg-phone" name="phone" type="tel" required placeholder="+5511999998888" defaultValue={status.phone ?? ""} className={input} />
      </div>
      <div className="flex items-center gap-3 md:col-span-3">
        <button type="submit" disabled={starting} className={button}>{starting ? "Pedindo código…" : "Receber código"}</button>
        <Status state={startState} />
      </div>
    </form>
  );
}
