import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { Footer } from "@/components/footer";
import type { MenuNotification } from "@/components/notifications-menu";
import { getSession } from "@/lib/auth";
import { countUnread, listNotifications } from "@/lib/data/social";
import { timeAgo } from "@/lib/format";
import { describeNotification } from "@/lib/notifications";
import { supabaseEnabled } from "@/lib/supabase/server";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "promo-br: ofertas que a comunidade aprova", template: "%s | promo-br" },
  description: "Promoções, cupons e descontos de verdade, publicados e votados por quem entende de preço.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  let unread = 0;
  let notifications: MenuNotification[] = [];
  if (session && supabaseEnabled()) {
    try {
      const [count, rows] = await Promise.all([countUnread(session.userId), listNotifications(session.userId, { limit: 8 })]);
      unread = count;
      notifications = rows.map((n) => ({ id: n.id, ...describeNotification(n), read: !!n.readAt, when: timeAgo(n.createdAt) }));
    } catch (e) {
      console.error("[layout] notificações indisponíveis", e);
    }
  }
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AppHeader session={session} unread={unread} notifications={notifications} />
        <main id="conteudo" className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
