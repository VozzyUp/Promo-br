"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { loadMoreFeedAction } from "@/app/actions/feed";
import { Button } from "@/components/ui/button";

/** Páginas seguintes do feed. Com rolagem infinita, carrega sozinho ao chegar no fim; o botão sempre existe como alternativa. */
export function FeedMore({ tab, startOffset, infinite }: { tab: string; startOffset: number | null; infinite: boolean }) {
  const [chunks, setChunks] = useState<ReactNode[]>([]);
  const [next, setNext] = useState<number | null>(startOffset);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (next == null || pending) return;
    setError(false);
    start(async () => {
      try {
        const r = await loadMoreFeedAction(tab, next);
        setChunks((c) => [...c, r.node]);
        setNext(r.next);
      } catch {
        setError(true);
      }
    });
  }, [next, pending, tab]);

  useEffect(() => {
    const el = sentinel.current;
    if (!infinite || !el || next == null || error) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) loadMore();
    }, { rootMargin: "400px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [infinite, next, error, loadMore]);

  return (
    <>
      {chunks.map((node, i) => (
        <div key={i} className="contents">{node}</div>
      ))}
      {next != null ? (
        <div ref={sentinel} className="flex flex-col items-center gap-2 py-4">
          {error ? <p className="text-sm text-danger" role="alert">Não foi possível carregar mais ofertas.</p> : null}
          <Button variant="secondary" onClick={loadMore} loading={pending}>
            {error ? "Tentar de novo" : "Ver mais ofertas"}
          </Button>
        </div>
      ) : null}
    </>
  );
}
