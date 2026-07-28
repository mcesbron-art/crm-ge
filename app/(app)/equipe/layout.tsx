import { requirePermission } from "@/lib/route-guards";

export default async function EquipeLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("view_all_pages");
  return <>{children}</>;
}
