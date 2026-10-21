import { AccountSideNav } from "@/components/account-menu";
import { requireUser } from "@/lib/auth";

export default async function AccountLayout({ children }: LayoutProps<"/conta">) {
  await requireUser("/conta");
  return (
    <div className="mx-auto flex max-w-(--layout-max) flex-col gap-4 px-4 py-6 md:flex-row md:gap-6">
      <AccountSideNav />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
