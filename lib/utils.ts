import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (!Number.isFinite(bytes) || bytes === 0) return "0 B";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"] as const;

  const i = Math.min(
    sizes.length - 1,
    Math.floor(Math.log(Math.abs(bytes)) / Math.log(k)),
  );

  const value = bytes / Math.pow(k, i);

  return `${parseFloat(value.toFixed(dm))} ${sizes[i]}`;
}
