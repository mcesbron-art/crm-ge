// Catégories de documents — vocabulaire fixé par le mockup fourni par
// l'utilisateur (Documents Groupe Écho). supabase/migrations/023_documents.sql.
export const DOCUMENT_CATEGORIES = [
  { value: "rh",      label: "RH & administratif" },
  { value: "com",      label: "Communication interne" },
  { value: "process", label: "Process & guides" },
  { value: "perso",   label: "Personnel" },
] as const;
export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["value"];
export const DOCUMENT_CATEGORY_LABEL: Record<string, string> = Object.fromEntries(DOCUMENT_CATEGORIES.map(c => [c.value, c.label]));

export type DocType = "pdf" | "word" | "excel" | "image";

export function typeFromMime(mime: string): DocType {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("word") || mime === "application/msword") return "word";
  if (mime.includes("sheet") || mime === "application/vnd.ms-excel") return "excel";
  return "pdf";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  const ko = bytes / 1024;
  if (ko < 1024) return `${(ko < 10 ? ko.toFixed(1) : Math.round(ko).toString()).replace(".", ",")} Ko`;
  const mo = ko / 1024;
  return `${(mo < 10 ? mo.toFixed(1) : Math.round(mo).toString()).replace(".", ",")} Mo`;
}
