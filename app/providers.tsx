"use client";

import { PreferencesProvider } from "@/lib/preferences/Preferences";
import type { ReactNode } from "react";
import { AuthProvider } from "@/modules/auth/context/AuthContext";

export function Providers({ children }: { children: ReactNode }) {
  return <PreferencesProvider><AuthProvider>{children}</AuthProvider></PreferencesProvider>;
}
