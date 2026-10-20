import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import { getSession } from "@/lib/auth";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "promo-br: ofertas que a comunidade aprova", template: "%s | promo-br" },
  description: "Promoções, cupons e descontos de verdade, publicados e votados por quem entende de preço.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AppHeader session={session} />
        <main id="conteudo" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
