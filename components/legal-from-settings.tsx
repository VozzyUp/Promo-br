import Link from "next/link";
import { Fragment } from "react";
import { LegalPage } from "@/components/legal-page";
import { getSetting } from "@/lib/data/settings";
import { LEGAL_DEFAULTS, type LegalSlug } from "@/lib/legal-defaults";
import { parseLegal, type Inline } from "@/lib/legal-text";

export type StoredLegal = { body: string; updatedAt?: string };

export async function getLegalDoc(slug: LegalSlug) {
  const def = LEGAL_DEFAULTS[slug];
  const custom = await getSetting<StoredLegal | null>(`legal.${slug}`, null);
  if (!custom?.body) return { ...def, custom: false };
  const updated = custom.updatedAt
    ? new Date(custom.updatedAt).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" })
    : def.updated;
  return { ...def, body: custom.body, updated, custom: true };
}

function Inlines({ items }: { items: Inline[] }) {
  return (
    <>
      {items.map((it, i) =>
        it.kind === "bold" ? <strong key={i}>{it.text}</strong>
        : it.kind === "link" ? (it.href.startsWith("/")
            ? <Link key={i} href={it.href} className="font-bold text-accent">{it.text}</Link>
            : <a key={i} href={it.href} rel="noopener noreferrer" className="font-bold text-accent">{it.text}</a>)
        : <Fragment key={i}>{it.text}</Fragment>)}
    </>
  );
}

export async function LegalFromSettings({ slug }: { slug: LegalSlug }) {
  const doc = await getLegalDoc(slug);
  return (
    <LegalPage title={doc.title} updated={doc.updated}>
      {parseLegal(doc.body).map((b, i) =>
        b.kind === "h2" ? <h2 key={i}>{b.text}</h2>
        : b.kind === "ul" ? <ul key={i}>{b.items.map((li, j) => <li key={j}><Inlines items={li} /></li>)}</ul>
        : <p key={i}><Inlines items={b.inline} /></p>)}
    </LegalPage>
  );
}