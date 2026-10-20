"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, loginAction, newPasswordAction, signupAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/field";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Senha" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Link href="/recuperar-senha" className="-mt-2 w-fit text-sm font-bold text-accent">Esqueci minha senha</Link>
      <Button type="submit" size="lg" full loading={pending}>Entrar</Button>
      <p className="text-center text-sm text-muted">
        Ainda não tem conta? <Link href={`/cadastrar?next=${encodeURIComponent(next)}`} className="font-bold text-accent">Cadastre-se</Link>
      </p>
    </form>
  );
}

export function SignupForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signupAction, undefined);
  if (state?.notice) {
    return (
      <div className="flex flex-col gap-4">
        <FormMessage tone="success">{state.notice}</FormMessage>
        <p className="text-sm text-muted">Não chegou? Confira a caixa de spam. O link vale por 24 horas.</p>
      </div>
    );
  }
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Field label="Como quer ser chamado" htmlFor="displayName">
        <Input id="displayName" name="displayName" autoComplete="name" required maxLength={40} defaultValue={state?.fields?.displayName} />
      </Field>
      <Field label="Nome de usuário" htmlFor="username" hint="Aparece nas suas ofertas. Letras minúsculas, números e _.">
        <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={24} pattern="[a-z0-9_]{3,24}" defaultValue={state?.fields?.username} aria-describedby="username-hint" />
      </Field>
      <Field label="E-mail" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Field label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-hint" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1 size-4 accent-(--color-accent)" required />
        <span>Li e aceito os <Link href="/sobre" className="font-bold text-accent">termos de uso</Link> e a <Link href="/privacidade" className="font-bold text-accent">política de privacidade</Link>.</span>
      </label>
      <Button type="submit" size="lg" full loading={pending}>Criar conta</Button>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="font-bold text-accent">Entrar</Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  if (state?.notice) return <FormMessage tone="success">{state.notice}</FormMessage>;
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Field label="E-mail da conta" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.fields?.email} />
      </Field>
      <Button type="submit" size="lg" full loading={pending}>Enviar link</Button>
      <Link href="/entrar" className="text-center text-sm font-bold text-accent">Voltar para o login</Link>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(newPasswordAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      {state?.error ? <FormMessage>{state.error}</FormMessage> : null}
      <Field label="Nova senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} aria-describedby="password-hint" />
      </Field>
      <Field label="Repita a nova senha" htmlFor="confirm">
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} maxLength={72} />
      </Field>
      <Button type="submit" size="lg" full loading={pending}>Salvar senha</Button>
    </form>
  );
}
