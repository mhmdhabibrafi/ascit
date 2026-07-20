'use client';

/**
 * Monitoring Dashboard Component
 * UI untuk monitoring system health dan metrics
 */

import React, { useEffect, useState } from 'react';
import { HealthCheckResponse } from '@/lib/health-check';
import { Activity, Database, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface MonitoringMetrics {
  health: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<MonitoringMetrics>({
    health: null,
    loading: true,
    error: null,
    lastUpdate: null,
  });

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setMetrics({
          health: data,
          loading: false,
          error: null,
          lastUpdate: new Date(),
        });
      } catch (error) {
        setMetrics((prev) => ({
          ...prev,
          loading: false,
          error: (error as Error).message,
        }));
      }
    };

    // Initial fetch
    fetchHealth();

    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (metrics.loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 animate-spin">
            <Activity className="w-8 h-8 text-blue-500 mx-auto" />
          </div>
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  const health = metrics.health;
  if (!health) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-red-600">
          <AlertCircle className="w-8 h-8 mx-auto mb-4" />
          <p>{metrics.error || 'Failed to load monitoring data'}</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'unhealthy':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Monitoring Dashboard</h1>
          <p className="text-gray-600 mt-2">Real-time system health and performance metrics</p>
        </div>

        {/* Overall Status */}
        <div className={`rounded-lg p-6 mb-8 ${getStatusColor(health.status)}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon(health.status)}
              <div>
                <p className="text-sm font-semibold opacity-75">Overall Status</p>
                <p className="text-2xl font-bold capitalize">{health.status}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm opacity-75">Uptime</p>
              <p className="text-xl font-semibold">{formatUptime(health.uptime)}</p>
            </div>
          </div>
        </div>

        {/* Health Checks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Database Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-blue-500" />
                <h2 className="text-lg font-semibold">Database</h2>
              </div>
              {getStatusIcon(health.checks.database.status)}
            </div>
            <p className={`px-3 py-1 rounded-full text-sm inline-block mb-3 ${getStatusColor(health.checks.database.status)}`}>
              {health.checks.database.status}
            </p>
            <p className="text-gray-600 text-sm mb-2">{health.checks.database.message}</p>
            <p className="text-gray-500 text-xs">
              Response time: {health.checks.database.responseTime.toFixed(2)}ms
            </p>
          </div>

          {/* Cache Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-purple-500" />
                <h2 className="text-lg font-semibold">Cache</h2>
              </div>
              {getStatusIcon(health.checks.cache.status)}
            </div>
            <p className={`px-3 py-1 rounded-full text-sm inline-block mb-3 ${getStatusColor(health.checks.cache.status)}`}>
              {health.checks.cache.status}
            </p>
            <p className="text-gray-600 text-sm mb-2">{health.checks.cache.message}</p>
            <p className="text-gray-500 text-xs">
              Response time: {health.checks.cache.responseTime.toFixed(2)}ms
            </p>
          </div>

          {/* API Check */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-green-500" />
                <h2 className="text-lg font-semibold">API</h2>
              </div>
              {getStatusIcon(health.checks.api.status)}
            </div>
            <p className={`px-3 py-1 rounded-full text-sm inline-block mb-3 ${getStatusColor(health.checks.api.status)}`}>
              {health.checks.api.status}
            </p>
            <p className="text-gray-600 text-sm mb-2">{health.checks.api.message}</p>
            <p className="text-gray-500 text-xs">
              Response time: {health.checks.api.responseTime.toFixed(2)}ms
            </p>
          </div>
        </div>

        {/* Cache Metrics */}
        {health.metrics?.cacheStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Cache Metrics
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="border-l-4 border-purple-500 pl-4">
                <p className="text-gray-600 text-sm">Cache Entries</p>
                <p className="text-2xl font-bold">{health.metrics.cacheStats.size}</p>
              </div>
              <div className="border-l-4 border-blue-500 pl-4">
                <p className="text-gray-600 text-sm">Cache Hits</p>
                <p className="text-2xl font-bold">{health.metrics.cacheStats.hits}</p>
              </div>
              <div className="border-l-4 border-orange-500 pl-4">
                <p className="text-gray-600 text-sm">Cache Misses</p>
                <p className="text-2xl font-bold">{health.metrics.cacheStats.misses}</p>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <p className="text-gray-600 text-sm">Hit Rate</p>
                <p className="text-2xl font-bold">{health.metrics.cacheStats.hitRate}</p>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Last updated: {metrics.lastUpdate?.toLocaleTimeString()}</span>
          </div>
          <p>Auto-refresh every 30 seconds</p>
        </div>
      </div>
    </div>
  );
}
