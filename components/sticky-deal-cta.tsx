"use client";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Botão fixo acima da barra inferior, só no celular. Aparece quando o botão principal da oferta sai da tela
 * e some perto do fim da página, para não cobrir o rodapé.
 */
export function StickyDealCta({ children }: { children: ReactNode }) {
  const [mainVisible, setMainVisible] = useState(true);
  const [endVisible, setEndVisible] = useState(false);
  useEffect(() => {
    const main = document.getElementById("deal-cta");
    const end = document.getElementById("page-end");
    if (!main) return;
    const a = new IntersectionObserver(([e]) => setMainVisible(e.isIntersecting));
    const b = new IntersectionObserver(([e]) => setEndVisible(e.isIntersecting));
    a.observe(main);
    if (end) b.observe(end);
    return () => { a.disconnect(); b.disconnect(); };
  }, []);
  if (mainVisible || endVisible) return null;
  return <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-bg/95 p-3 backdrop-blur md:hidden">{children}</div>;
}