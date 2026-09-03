"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/modules/auth/context/AuthContext";
import type { SystemUser, SystemUserInput } from "../models/User";
import { adminCreateUser, adminDeleteUser, adminUpdateUser, listProfiles } from "../services/usersService";

export function useUsers() {
  const { user: sessionUser, refreshProfile } = useAuth();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (sessionUser?.role !== "Admin") {
      setUsers(sessionUser ? [sessionUser] : []);
      setLoading(false);
      return;
    }
    try {
      setUsers(await listProfiles());
      setError(null);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "No se pudieron cargar los usuarios.");
    } finally {
      setLoading(false);
    }
  }, [sessionUser]);

  useEffect(() => {
    queueMicrotask(() => { void refresh(); });
    if (sessionUser?.role !== "Admin") return;
    const interval = window.setInterval(() => { void refresh(); }, 15_000);
    const refreshOnFocus = () => { void refresh(); };
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refresh, sessionUser?.role]);

  const create = useCallback(async (input: SystemUserInput) => {
    if (!input.password) throw new Error("Escribe una contraseña temporal.");
    const created = await adminCreateUser({ ...input, password: input.password });
    await refresh();
    return created;
  }, [refresh]);

  const update = useCallback(async (id: string, input: SystemUserInput) => {
    const updated = await adminUpdateUser(id, input);
    if (id === sessionUser?.id) await refreshProfile();
    await refresh();
    return updated;
  }, [refresh, refreshProfile, sessionUser]);

  const remove = useCallback(async (id: string) => {
    await adminDeleteUser(id);
    await refresh();
  }, [refresh]);

  return useMemo(() => ({
    users,
    loading,
    error,
    refresh,
    getById: (id: string) => users.find((item) => item.id === id),
    getByEmail: (email: string) => users.find((item) => item.email.toLowerCase() === email.toLowerCase()),
    getByRoleDemo: (role: SystemUser["role"]) => users.find((item) => item.role === role),
    create,
    update,
    remove,
  }), [users, loading, error, refresh, create, update, remove]);
}
