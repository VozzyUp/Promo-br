"use client";

import { useActionState } from "react";
import {
  changeEmailAction, changePasswordAction, changeUsernameAction, deleteAccountAction, removeAvatarAction, updateBioAction,
  uploadAvatarAction, type AccountState,
} from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

function Status({ state, okText = "Salvo." }: { state: AccountState; okText?: string }) {
  if (state?.error) return <FormMessage>{state.error}</FormMessage>;
  if (state?.notice) return <FormMessage tone="info">{state.notice}</FormMessage>;
  if (state?.ok) return <FormMessage tone="success">{okText}</FormMessage>;
  return null;
}

export function AvatarForm({ avatarUrl, name }: { avatarUrl: string | null; name: string }) {
  const [state, action, pending] = useActionState(uploadAvatarAction, undefined);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- avatar vem do Storage do Supabase
          <img src={avatarUrl} alt={`Foto de ${name}`} className="size-16 rounded-pill object-cover" />
        ) : (
          <span className="grid size-16 place-items-center rounded-pill bg-surface text-2xl font-bold" aria-hidden>{name.slice(0, 1).toUpperCase()}</span>
        )}
        <form action={action} className="flex flex-col gap-2">
          <label htmlFor="avatar" className="text-sm font-bold">Trocar foto</label>
          <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" required className="text-sm" />
          <p className="text-xs text-muted">JPG, PNG ou WebP, até 1 MB, mínimo de 100 x 100 pixels. Prefira imagem quadrada.</p>
          <div><Button type="submit" size="sm" loading={pending}>Enviar foto</Button></div>
        </form>
      </div>
      {avatarUrl ? (
        <form action={removeAvatarAction}>
          <button type="submit" className="text-sm text-danger hover:underline">Remover foto</button>
        </form>
      ) : null}
      <Status state={state} okText="Foto atualizada." />
    </div>
  );
}

export function BioForm({ bio }: { bio: string }) {
  const [state, action, pending] = useActionState(updateBioAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Sobre você" htmlFor="bio" hint="Até 200 caracteres. Aparece no seu perfil público.">
        <textarea id="bio" name="bio" defaultValue={bio} maxLength={200} rows={3} aria-describedby="bio-hint" className="w-full rounded-sm border border-border-input bg-bg px-3 py-2 text-base" />
      </Field>
      <Status state={state} />
      <div><Button type="submit" loading={pending}>Salvar</Button></div>
    </form>
  );
}

export function UsernameForm({ username, blockedUntil }: { username: string; blockedUntil: string | null }) {
  const [state, action, pending] = useActionState(changeUsernameAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field
        label="Nome de usuário"
        htmlFor="username"
        hint={blockedUntil ? `Você poderá trocar de novo em ${blockedUntil}.` : "Só pode ser trocado uma vez a cada 12 meses. Letras minúsculas, números e _."}
      >
        <Input id="username" name="username" defaultValue={username} required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" disabled={!!blockedUntil} aria-describedby="username-hint" />
      </Field>
      <Status state={state} />
      <div><Button type="submit" loading={pending} disabled={!!blockedUntil}>Trocar nome</Button></div>
    </form>
  );
}

export function EmailForm({ current }: { current: string }) {
  const [state, action, pending] = useActionState(changeEmailAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="E-mail" htmlFor="email" hint="Mandamos um link de confirmação para o endereço novo.">
        <Input id="email" name="email" type="email" defaultValue={current} required autoComplete="email" aria-describedby="email-hint" />
      </Field>
      <Status state={state} />
      <div><Button type="submit" loading={pending}>Trocar e-mail</Button></div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field label="Senha atual" htmlFor="current">
        <Input id="current" name="current" type="password" required autoComplete="current-password" />
      </Field>
      <Field label="Senha nova" htmlFor="next" hint="De 8 a 72 caracteres.">
        <Input id="next" name="next" type="password" required minLength={8} maxLength={72} autoComplete="new-password" aria-describedby="next-hint" />
      </Field>
      <Field label="Repita a senha nova" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" required minLength={8} maxLength={72} autoComplete="new-password" />
      </Field>
      <Status state={state} okText="Senha trocada." />
      <div><Button type="submit" loading={pending}>Trocar senha</Button></div>
    </form>
  );
}

export function DeleteAccountForm({ username }: { username: string }) {
  const [state, action, pending] = useActionState(deleteAccountAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm">
        Apagar a conta remove seu perfil, votos, alertas, mensagens e notificações. Suas ofertas continuam no ar, sem o seu nome, e seus
        comentários aparecem como &ldquo;usuário removido&rdquo;. <strong>Não dá para desfazer.</strong>
      </p>
      <Field label={`Para confirmar, digite ${username}`} htmlFor="confirm-delete">
        <Input id="confirm-delete" name="confirm" required autoComplete="off" />
      </Field>
      <Status state={state} />
      <div><Button type="submit" variant="danger" loading={pending}>Apagar minha conta</Button></div>
    </form>
  );
}
