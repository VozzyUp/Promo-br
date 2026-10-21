"use client";
import { useTransition, type FormEvent } from "react";

/**
 * Envia o formulário para a action sem limpar os campos.
 * No React 19 um <form action> volta ao valor inicial depois de qualquer envio, mesmo quando o servidor recusa;
 * no painel isso apagaria o que a pessoa digitou. Mantém o botão clicado (name/value) no FormData.
 */
export function useKeepForm(action: (payload: FormData) => void) {
  const [, start] = useTransition();
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    start(() => action(fd));
  };
}
