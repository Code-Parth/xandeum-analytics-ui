"use client";

import React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export function ThemeToggleButton() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = React.useCallback(() => {
    if (typeof window === "undefined") return;

    const switchTheme = () => {
      setTheme(theme === "light" ? "dark" : "light");
    };

    if (!document.startViewTransition) {
      switchTheme();
      return;
    }

    document.startViewTransition(switchTheme);
  }, [theme, setTheme]);

  return (
    <Button
      onClick={toggleTheme}
      variant="outline"
      size="icon"
      className="group relative h-9 w-9 cursor-pointer p-0"
      name="Theme Toggle Button">
      <SunIcon className="size-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
      <MoonIcon className="absolute size-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
      <span className="sr-only">Theme Toggle </span>
    </Button>
  );
}
