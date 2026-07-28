"use client";

import { createContext, useContext, useEffect, useCallback, useState, ReactNode } from "react";

export type Notification = {
  id: string;
  type: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

type NotificationsContextValue = {
  unreadCount: number;
  notifications: Notification[];
  loading: boolean;
  refetchList: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

const POLL_INTERVAL_MS = 25000;

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(() => {
    fetch("/api/notifications/unread-count")
      .then(r => r.json())
      .then((d: { count?: number }) => setUnreadCount(d.count ?? 0))
      .catch(() => null);
  }, []);

  // Un seul interval pour toute la session — c'est le rôle du Provider,
  // pas des composants consommateurs (cloche, dropdown), pour ne pas
  // multiplier les appels réseau si plusieurs composants avaient chacun
  // leur propre polling.
  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  const refetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?page_size=20");
      const d: { notifications?: Notification[] } = await res.json();
      setNotifications(d.notifications ?? []);
    } catch {
      // silencieux — la cloche affichera juste une liste vide
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n)));
    setUnreadCount(prev => Math.max(0, prev - 1));
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    } catch {
      // pas de rollback : au pire un léger décalage jusqu'au prochain poll
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    setUnreadCount(0);
    try {
      await fetch("/api/notifications/read-all", { method: "PATCH" });
    } catch {
      // idem
    }
  }, []);

  const value: NotificationsContextValue = {
    unreadCount,
    notifications,
    loading,
    refetchList,
    markAsRead,
    markAllAsRead,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications doit être utilisé dans <NotificationsProvider>");
  return ctx;
}
