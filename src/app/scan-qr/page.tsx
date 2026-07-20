import { ScanQrClient } from "@/components/assets/scan-qr-client";
import { redirect } from "next/navigation";

export default async function ScanQrPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams;
  if (code?.trim()) redirect(`/public/assets/${encodeURIComponent(code.trim())}`);
  return <ScanQrClient />;
}
