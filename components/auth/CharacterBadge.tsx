"use client";

import { useState, useRef, useEffect } from "react";
import { LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

export function CharacterBadge() {
  const { character, logout, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading || !character) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg border border-border px-2 py-1 text-sm transition-colors hover:border-accent"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={character.portraitUrl}
          alt={character.characterName}
          width={24}
          height={24}
          className="rounded"
        />
        <span className="hidden text-foreground/80 sm:inline">{character.characterName}</span>
        <ChevronDown className="h-3 w-3 text-foreground/40" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[160px] rounded-lg border border-border bg-surface shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <div className="text-xs text-foreground/50">Logged in as</div>
            <div className="text-sm font-medium text-foreground">{character.characterName}</div>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await logout();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-foreground/70 transition-colors hover:bg-surface-alt hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
