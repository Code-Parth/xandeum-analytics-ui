"use client";

import { queryClient } from "@/constants";
import { ThemeProvider } from "@/theme/theme-provider";
import { QueryClientProvider } from "@tanstack/react-query";

export function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
