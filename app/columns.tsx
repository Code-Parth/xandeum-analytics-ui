"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatBytes } from "@/lib/utils";

// Type for node group data displayed in the table
export type NodeGroup = {
  key: string;
  pubkey: string | null;
  addresses: { id: string; ipAddress: string; port: number }[];
  committedStorage: number;
  usedStorage: number;
  usagePercent: number | null;
  version: string;
};

function truncateKey(key: string) {
  if (key.length <= 16) return key;
  return `${key.slice(0, 8)}...${key.slice(-8)}`;
}

export const columns: ColumnDef<NodeGroup>[] = [
  {
    accessorKey: "pubkey",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Public Key
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const pubkey = row.getValue("pubkey") as string | null;
      if (!pubkey) {
        return <span className="text-muted-foreground">Unknown</span>;
      }
      return (
        <Link
          href={`/node/${pubkey}`}
          className="text-primary font-mono text-sm hover:underline">
          {truncateKey(pubkey)}
        </Link>
      );
    },
  },
  {
    accessorKey: "addresses",
    header: "Addresses",
    cell: ({ row }) => {
      const addresses = row.getValue("addresses") as NodeGroup["addresses"];
      return (
        <div className="space-y-1 text-xs">
          {addresses.map((addr) => (
            <div key={addr.id} className="text-muted-foreground">
              {addr.ipAddress}:{addr.port}
            </div>
          ))}
        </div>
      );
    },
    enableSorting: false,
  },
  {
    accessorKey: "committedStorage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Committed Storage
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bytes = row.getValue("committedStorage") as number;
      return <span className="font-medium">{formatBytes(bytes)}</span>;
    },
  },
  {
    accessorKey: "usedStorage",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Used Storage
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const bytes = row.getValue("usedStorage") as number;
      return <span className="font-medium">{formatBytes(bytes)}</span>;
    },
  },
  {
    accessorKey: "usagePercent",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Usage %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const percent = row.getValue("usagePercent") as number | null;
      if (percent === null || Number.isNaN(percent)) {
        return <span className="text-muted-foreground">N/A</span>;
      }
      return <span className="font-medium">{percent.toFixed(10)}%</span>;
    },
  },
  {
    accessorKey: "version",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Version
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const version = row.getValue("version") as string;
      return <Badge variant="outline">{version}</Badge>;
    },
  },
];
