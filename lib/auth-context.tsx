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
  canSeeMoney: boolean;
  canAccessAdmin: boolean;
  /** Alias de currentUser.role — le rôle authentifié est l'unique source de
   *  vérité, il n'existe plus aucun mécanisme pour le faire diverger côté
   *  client (pas de bascule de vue manuelle). Conservé sous ce nom pour ne
   *  pas devoir toucher tous les fichiers qui l'utilisent déjà. */
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

  // initialUser vient du layout serveur : après un router.refresh() (ex. mise
  // à jour du profil), une nouvelle valeur arrive ici mais useState() ne la
  // reprend pas automatiquement.
  useEffect(() => {
    setCurrentUser(initialUser);
  }, [initialUser]);

  // Dérivés de la matrice centralisée (lib/permissions.ts) — on passe par
  // can() pour rester cohérent avec le reste de l'app si la matrice évolue.
  const value: AuthContextValue = {
    currentUser,
    canSeeMoney:    can(currentUser.role, "view_billing"),
    canAccessAdmin: can(currentUser.role, "manage_users"),
    effectiveRole:  currentUser.role,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth doit être utilisé dans <AuthProvider>");
  return ctx;
}
