import { requirePermission } from "@/lib/route-guards";

export default async function AdministrationLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("manage_users");
  return <>{children}</>;
}
