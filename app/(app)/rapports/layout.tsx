import { requirePermission } from "@/lib/route-guards";

export default async function RapportsLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("view_billing");
  return <>{children}</>;
}
