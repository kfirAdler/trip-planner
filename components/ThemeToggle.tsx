"use client";

import { IconSun, IconMoon } from "@/components/icons";

function setTheme(theme: "light" | "dark") {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("theme", theme);
}

function currentTheme(): "light" | "dark" {
  const saved = document.documentElement.dataset.theme;
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeToggle() {
  return (
    <button
      type="button"
      onClick={() => setTheme(currentTheme() === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="fixed top-[calc(env(safe-area-inset-top)+0.75rem)] right-4 z-30 flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md"
    >
      <span data-theme-icon="sun">
        <IconSun size={18} />
      </span>
      <span data-theme-icon="moon">
        <IconMoon size={18} />
      </span>
    </button>
  );
}
