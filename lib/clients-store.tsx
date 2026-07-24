"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  Client, ClientMetrics, ClientProject, ClientContact,
  BASE_CLIENTS,
  getClientMetrics as getBaseMetrics,
  getClientProjects as getBaseProjects,
  getClientContact as getBaseContact,
} from "./clients-data";

const STORAGE_KEY = "crm_extra_clients";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientsStore {
  clients: Client[];
  getClientById: (id: string) => Client | null;
  getMetrics: (id: string) => ClientMetrics | null;
  getProjects: (id: string) => ClientProject[];
  getContact: (id: string) => ClientContact | null;
  addClient: (c: Client) => void;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const ClientsContext = createContext<ClientsStore | null>(null);

export function ClientsProvider({ children }: { children: ReactNode }) {
  const [extraClients, setExtraClients] = useState<Client[]>([]);

  // Hydrate depuis localStorage après le montage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setExtraClients(JSON.parse(stored));
    } catch {}
  }, []);

  // Nouveaux clients en tête, base ensuite
  const clients: Client[] = [...extraClients, ...BASE_CLIENTS];

  function getClientById(id: string): Client | null {
    return clients.find(c => c.id === id) ?? null;
  }

  function getMetrics(id: string): ClientMetrics | null {
    return getBaseMetrics(id);
  }

  function getProjects(id: string): ClientProject[] {
    return getBaseProjects(id);
  }

  function getContact(id: string): ClientContact | null {
    // Essaie le contact depuis la base d'abord
    const base = getBaseContact(id);
    if (base) return base;
    // Pour les nouveaux clients, on synthétise un contact depuis le client lui-même
    const client = getClientById(id);
    if (client?.contactName) {
      return {
        name: client.contactName,
        role: "Contact",
        email: client.email,
        phone: client.phone,
        avatar: client.contactName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2),
        color: "#B08D32",
      };
    }
    return null;
  }

  function addClient(client: Client) {
    setExtraClients(prev => {
      const updated = [client, ...prev];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  return (
    <ClientsContext.Provider value={{ clients, getClientById, getMetrics, getProjects, getContact, addClient }}>
      {children}
    </ClientsContext.Provider>
  );
}

export function useClientsStore(): ClientsStore {
  const ctx = useContext(ClientsContext);
  if (!ctx) throw new Error("useClientsStore doit être utilisé dans <ClientsProvider>");
  return ctx;
}
