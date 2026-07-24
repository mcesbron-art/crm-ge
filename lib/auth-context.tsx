"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { can, type Role } from "@/lib/permissions";

export type { Role };

export type AppUser = {
  id: number;
  nom: string;
  email: string;
  pole: string;
  avatar: string;
  avatarUrl?: string | null;
  color: string;
  role: Role;
  base: number;
  actif: boolean;
};

type AuthContextValue = {
  /** Utilisateur connecté (depuis la session serveur — read-only) */
  currentUser: AppUser;
  /** Mode aperçu pour Admin (voir l'UI comme un collab) */
  previewMode: "real" | "collab";
  setPreviewMode: (m: "real" | "collab") => void;
  // Helpers calculés (tiennent compte du previewMode)
  canSeeMoney: boolean;
  canAccessAdmin: boolean;
  /** Rôle à utiliser pour lib/permissions.ts::can() côté client — currentUser.role
   *  en temps normal, "collaborateur" en mode aperçu. Utiliser CE rôle (jamais
   *  currentUser.role directement) pour toute vérification de permission dans
   *  l'UI, sous peine de garder des actions Admin visibles pendant l'aperçu
   *  collaborateur. */
  effectiveRole: Role;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser,
}: {
  children: ReactNode;
  initialUser: AppUser;
}) {
  const [currentUser, setCurrentUser] = useState<AppUser>(initialUser);
  const [previewMode, setPreviewMode] = useState<"real" | "collab">("real");

  // initialUser vient du layout serveur : après un router.refresh() (ex. mise
  // à jour du profil), une nouvelle valeur arrive ici mais useState() ne la
  // reprend pas automatiquement.
  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  // Dérivés de la matrice centralisée (lib/permissions.ts) — admin a
  // toutes les permissions donc les deux valent simplement
  // currentUser.role === "admin", mais on passe par can() pour rester
  // cohérent avec le reste de l'app si la matrice évolue.
  // Mode aperçu actif uniquement si le vrai rôle de l'user est admin.
  const realCanSeeMoney    = can(currentUser.role, "view_billing");
  const realCanAccessAdmin = can(currentUser.role, "manage_users");
  const isPreview          = previewMode === "collab" && realCanSeeMoney;

  const value: AuthContextValue = {
    currentUser,
    previewMode,
    setPreviewMode: (m) => {
      if (!realCanSeeMoney && m === "collab") return;
      setPreviewMode(m);
    },
    canSeeMoney:    isPreview ? false : realCanSeeMoney,
    canAccessAdmin: isPreview ? false : realCanAccessAdmin,
    effectiveRole:  isPreview ? "collaborateur" : currentUser.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
