"use client";

import dynamic from "next/dynamic";

const ReplacementRecommendationsClient = dynamic(
  () => import("@/components/dashboard/replacement-recommendations-client").then((mod) => mod.ReplacementRecommendationsClient),
  { ssr: false }
);

export default function RecommendationsPage() {
  return <ReplacementRecommendationsClient />;
}
