"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(
  () => import("@/components/dashboard/dashboard-client").then((mod) => mod.DashboardClient),
  { ssr: false }
);

export default function DashboardPage() {
  return <DashboardClient />;
}
