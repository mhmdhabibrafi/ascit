/**
 * Monitoring Page
 * Route handler untuk halaman monitoring
 */

import { MonitoringDashboard } from "@/components/monitoring/monitoring-dashboard";

export const metadata = {
  title: "System Monitoring - ASCIT",
  description: "Real-time system health monitoring dashboard",
};

export default function MonitoringPage() {
  return <MonitoringDashboard />;
}
