import type { Metadata } from "next";

type Props = {
  params: Promise<{ pubkey: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pubkey } = await params;
  const truncatedKey =
    pubkey.length > 16 ? `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}` : pubkey;

  return {
    title: `Node ${truncatedKey} | Xandeum Network Analytics`,
    description: `Detailed analytics and metrics for Xandeum network node ${truncatedKey}. View latency, storage usage, version history, and performance data.`,
  };
}

export default function NodeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
