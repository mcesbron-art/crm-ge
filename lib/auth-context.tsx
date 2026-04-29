"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type Role = "direction" | "admin" | "collaborateur";

export type AppUser = {
  id: number;
  nom: string;
  email: string;
  pole: string;
  avatar: string;
  color: string;
  role: Role;
  base: number; // heures/semaine
  actif: boolean;
};

/**
 * Utilisateurs du CRM.
 * - "direction"     : Maryline → tous droits + Administration
 * - "admin"         : Fanny → tous droits données (chiffres) mais pas Administration
 * - "collaborateur" : autres → état des dossiers, pas de montants/marges
 */
const INITIAL_USERS: AppUser[] = [
  { id: 0, nom: "Maryline",  email: "maryline@groupe-echo.fr",  pole: "Direction",                      avatar: "MC", color: "#C5A55A", role: "direction",     base: 35, actif: true },
  { id: 1, nom: "Noémie",    email: "noemie@groupe-echo.fr",    pole: "Graphisme / Photo / Vidéo",      avatar: "N",  color: "#8E24AA", role: "collaborateur", base: 35, actif: true },
  { id: 2, nom: "Amandine",  email: "amandine@groupe-echo.fr",  pole: "Web / SEO / Contenu",            avatar: "A",  color: "#1E88E5", role: "collaborateur", base: 35, actif: true },
  { id: 3, nom: "Jérémy",    email: "jeremy@groupe-echo.fr",    pole: "Social Media / Vidéo",           avatar: "J",  color: "#43A047", role: "collaborateur", base: 35, actif: true },
  { id: 4, nom: "Marcellin", email: "marcellin@groupe-echo.fr", pole: "SEO / SEA / Sites standards",    avatar: "M",  color: "#FB8C00", role: "collaborateur", base: 35, actif: true },
  { id: 5, nom: "Arthur",    email: "arthur@groupe-echo.fr",    pole: "Sites complexes / Ads",          avatar: "Ar", color: "#E53935", role: "collaborateur", base: 39, actif: true },
  { id: 6, nom: "Fanny",     email: "fanny@groupe-echo.fr",     pole: "Planning / Production",          avatar: "F",  color: "#00897B", role: "admin",         base: 35, actif: true },
];

type AuthContextValue = {
  currentUser: AppUser;
  setCurrentUserById: (id: number) => void;
  users: AppUser[];
  addUser: (u: Omit<AppUser, "id">) => void;
  updateUser: (id: number, patch: Partial<AppUser>) => void;
  toggleActif: (id: number) => void;
  /** "real" : vue normale du rôle de l'utilisateur connecté.
   *  "collab" : Direction/Admin force temporairement la vue Collaborateur (aperçu). */
  previewMode: "real" | "collab";
  setPreviewMode: (m: "real" | "collab") => void;
  // Helpers calculés (tiennent compte du previewMode)
  canSeeMoney: boolean;     // direction + admin → voient les € / marges / coûts
  canAccessAdmin: boolean;  // direction uniquement → page Administration
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [currentUserId, setCurrentUserId] = useState<number>(0); // Maryline par défaut
  const [previewMode, setPreviewMode] = useState<"real" | "collab">("real");

  const currentUser = users.find((u) => u.id === currentUserId) ?? users[0];

  const setCurrentUserById = (id: number) => {
    if (users.some((u) => u.id === id && u.actif)) {
      setCurrentUserId(id);
    }
  };

  const addUser: AuthContextValue["addUser"] = (u) => {
    setUsers((prev) => {
      const nextId = Math.max(...prev.map((p) => p.id)) + 1;
      return [...prev, { ...u, id: nextId }];
    });
  };

  const updateUser: AuthContextValue["updateUser"] = (id, patch) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  };

  const toggleActif: AuthContextValue["toggleActif"] = (id) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, actif: !u.actif } : u)));
    // Si on désactive l'utilisateur courant, basculer sur Maryline
    if (currentUserId === id) setCurrentUserId(0);
  };

  // Si l'utilisateur réel est Direction/Admin et active le mode aperçu, on force la vue collab.
  const realCanSeeMoney    = currentUser.role !== "collaborateur";
  const realCanAccessAdmin = currentUser.role === "direction";
  const isPreview          = previewMode === "collab" && realCanSeeMoney;

  const value: AuthContextValue = {
    currentUser,
    setCurrentUserById,
    users,
    addUser,
    updateUser,
    toggleActif,
    previewMode,
    setPreviewMode: (m) => {
      // Empêche un collaborateur (qui ne devrait pas voir le bouton de toute façon) d'activer un mode meaningless
      if (!realCanSeeMoney && m === "collab") return;
      setPreviewMode(m);
    },
    canSeeMoney:    isPreview ? false : realCanSeeMoney,
    canAccessAdmin: isPreview ? false : realCanAccessAdmin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
