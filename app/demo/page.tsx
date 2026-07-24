import DashboardExact from "@/components/DashboardExact";

// Rendu dynamique : ce composant consomme du contexte client (thème) qui ne
// peut pas être résolu lors du prérendu statique.
export const dynamic = "force-dynamic";

export default function DemoPage() {
  return <DashboardExact />;
}
