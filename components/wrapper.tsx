"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";

export function Wrapper({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [grid, setGrid] = useState({
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setGrid({
        x: Math.floor(window.innerWidth / 44),
        y: Math.floor(window.innerHeight / 44),
      });
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center px-6">
      <div
        className={`absolute top-5 left-5 aspect-square size-4 ${
          isDark ? "bg-white/50" : "bg-black/50"
        }`}
      />
      <div
        className={`absolute top-5 right-5 aspect-square size-4 ${
          isDark ? "bg-white/50" : "bg-black/50"
        }`}
      />
      <div
        className={`absolute bottom-5 left-5 aspect-square size-4 ${
          isDark ? "bg-white/50" : "bg-black/50"
        }`}
      />
      <div
        className={`absolute right-5 bottom-5 aspect-square size-4 ${
          isDark ? "bg-white/50" : "bg-black/50"
        }`}
      />
      <div
        className={`relative z-10 m-6 size-full border ${
          isDark ? "border-white/30 bg-[#0B0B0D]" : "border-black/30 bg-gray-50"
        }`}>
        <div className="absolute inset-0 flex">
          {Array.from({ length: grid.x }).map((_, index) => (
            <div
              key={`col-${index}`}
              className={`h-full border-r ${
                isDark ? "border-white/5" : "border-black/5"
              }`}
              style={{ width: `${100 / grid.x}%` }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col">
          {Array.from({ length: grid.y }).map((_, index) => (
            <div
              key={`row-${index}`}
              className={`w-full border-b ${
                isDark ? "border-white/5" : "border-black/5"
              }`}
              style={{ height: `${100 / grid.y}%` }}
            />
          ))}
        </div>
        <div className="relative z-20 h-full w-full">{children}</div>
      </div>
    </div>
  );
}
