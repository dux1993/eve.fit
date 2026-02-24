"use client";

import { LogIn } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function LoginButton({ compact = false }: { compact?: boolean }) {
  const { login, loading } = useAuth();

  if (loading) return null;

  return (
    <button
      onClick={login}
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground/70 transition-colors hover:border-accent hover:text-accent"
    >
      <LogIn className="h-4 w-4" />
      {!compact && "Login with EVE"}
    </button>
  );
}
