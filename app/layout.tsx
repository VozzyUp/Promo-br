import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import { AppHeader } from "@/components/app-header";
import { BfBanner } from "@/components/bf-banner";
import { BottomNav } from "@/components/bottom-nav";
import { AdScript } from "@/components/consent/ad-script";
import { AdsProvider } from "@/components/consent/ads-context";
import { ConsentBanner } from "@/components/consent/consent-banner";
import { SideRails } from "@/components/consent/side-rails";
import { Footer } from "@/components/footer";
import type { MenuNotification } from "@/components/notifications-menu";
import { getSession } from "@/lib/auth";
import { listCategories } from "@/lib/data";
import { DEFAULT_BRAND, getAdsSettings, getSetting, type BrandSettings } from "@/lib/data/settings";
import { countUnread, listNotifications } from "@/lib/data/social";
import { timeAgo } from "@/lib/format";
import { describeNotification } from "@/lib/notifications";
import { supabaseEnabled } from "@/lib/supabase/server";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"], display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getSetting<BrandSettings>("public.brand", DEFAULT_BRAND);
  return {
    title: { default: `${brand.siteName}: ofertas que a comunidade aprova`, template: `%s | ${brand.siteName}` },
    description: brand.description,
  };
}

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
  const categories = (await listCategories().catch(() => [])).map((c) => ({ name: c.name, slug: c.slug }));
  const ads = await getAdsSettings();
  const brand = await getSetting<BrandSettings>("public.brand", DEFAULT_BRAND);
  return (
    <html lang="pt-BR" className={`${figtree.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <AdsProvider config={ads}>
          <BfBanner />
          <AppHeader siteName={brand.siteName} session={session} unread={unread} notifications={notifications} categories={categories} />
          <div className="relative flex-1">
            <SideRails />
            <main id="conteudo">{children}</main>
          </div>
          <Footer notice={brand.commissionNotice} />
          <BottomNav categories={categories} loggedIn={!!session} isStaff={session?.role === "admin" || session?.role === "moderator"} unread={unread} />
          <ConsentBanner />
          <AdScript />
        </AdsProvider>
      </body>
    </html>
  );
}
