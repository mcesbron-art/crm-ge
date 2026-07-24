import { redirect } from "next/navigation";

// Toujours recalculé côté serveur : une redirection statique mise en cache
// peut être servie de façon incohérente par le CDN entre deux déploiements.
export const dynamic = "force-dynamic";

export default function Home() {
  redirect("/dashboard");
}
