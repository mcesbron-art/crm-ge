// Même esprit que task-taxonomy.ts / absence-taxonomy.ts / document-taxonomy.ts —
// vocabulaire figé pour project_type (supabase/migrations/005_project_type.sql),
// partagé entre ProjetsClient.tsx (filtre/formulaire) et le rapport de temps
// (répartition par type) pour ne pas dupliquer libellés et couleurs.
export const PROJECT_TYPES = [
  { value: "site_web",             label: "Site web" },
  { value: "graphisme",            label: "Graphisme" },
  { value: "communication",        label: "Communication" },
  { value: "community_management", label: "Community Management" },
  { value: "formation",            label: "Formation" },
  { value: "evenementiel",         label: "Événementiel" },
  { value: "autre",                label: "Autre" },
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number]["value"];

export const PROJECT_TYPE_LABEL: Record<string, string> = Object.fromEntries(
  PROJECT_TYPES.map(t => [t.value, t.label])
);

// Une couleur d'accent par type — utilisée pour les badges et graphes du
// rapport de temps (répartition par type de projet).
export const PROJECT_TYPE_COLOR: Record<string, string> = {
  site_web: "#2563EB",
  graphisme: "#7C3AED",
  communication: "#C9A24E",
  community_management: "#16A34A",
  formation: "#0D9488",
  evenementiel: "#DB2777",
  autre: "#8C8B83",
};
