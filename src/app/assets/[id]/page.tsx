import { AssetDetailClient } from "@/components/assets/asset-detail-client";

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AssetDetailClient id={id} />;
}
