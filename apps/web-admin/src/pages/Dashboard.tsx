import React, { useEffect, useState } from 'react';
import { api, type HealthResponse } from '../lib/api';
import type { AppFeatureFlags, ProductDashboardMetricsDTO } from '@kshetra/shared';
import { MapPin, ShieldAlert, Radio, CheckCircle2, Server, Zap, ArrowRight, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthError, setHealthError] = useState(false);
  const [flags, setFlags] = useState<AppFeatureFlags | null>(null);
  const [flagsError, setFlagsError] = useState(false);
  const [productMetrics, setProductMetrics] = useState<ProductDashboardMetricsDTO | null>(null);
  const [productMetricsError, setProductMetricsError] = useState(false);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => setHealthError(true));
    api.getFlags().then(setFlags).catch(() => setFlagsError(true));
    api.getProductDashboardMetrics()
      .then(setProductMetrics)
      .catch(() => setProductMetricsError(true));
  }, []);

  const flagEntries = flags ? Object.entries(flags) : [];
  const enabledFlagsCount = flagEntries.filter(([, enabled]) => enabled === true).length;
  const formatCount = (value: number | null | undefined) =>
    value == null ? 'Unavailable' : new Intl.NumberFormat().format(value);
  const formatPercent = (value: number | null | undefined) =>
    value == null ? 'Unavailable' : `${value.toFixed(2)}%`;
  const metricFailureDetail = productMetricsError
    ? 'Requires an authorized admin session and available analytics database'
    : 'Loading from the authenticated analytics API';

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span>Platform operations</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Poligram Operations Dashboard</h1>
          <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
            This page shows values returned by connected APIs. Metrics without a live data source are marked unavailable.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 relative z-10 shrink-0">
          <Link to="/feature-flags" className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-blue-600/30 transition">
            <span>Manage Flags</span><ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/moderation" className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-2 transition">
            <ShieldAlert className="w-4 h-4 text-purple-400" /><span>Moderation</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Active constituencies (30d)"
          icon={<MapPin className="w-4 h-4 text-blue-400" />}
          value={productMetrics
            ? `${formatCount(productMetrics.geographyDensity.activeConstituencies)} / ${formatCount(productMetrics.geographyDensity.totalConstituencies)}`
            : 'Unavailable'}
          detail={productMetrics
            ? 'Observed activity / rows in the current constituency catalogue'
            : metricFailureDetail}
        />
        <MetricCard title="Active live streams" icon={<Radio className="w-4 h-4 text-red-400" />} value="Unavailable" detail="Live stream inventory is not connected" />
        <MetricCard title="Pending moderation" icon={<ShieldAlert className="w-4 h-4 text-purple-400" />} value="Unavailable" detail="Queue count requires an authenticated moderation API" />
        <MetricCard
          title="Feature flags"
          icon={<Zap className="w-4 h-4 text-amber-400" />}
          value={flags ? `${enabledFlagsCount} / ${flagEntries.length}` : 'Unavailable'}
          detail={flags ? 'Values returned by the feature flag endpoint' : flagsError ? 'Feature flag endpoint could not be reached' : 'Loading from API'}
        />
      </div>

      <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h2 className="font-bold text-white text-base">Product analytics</h2>
            <p className="text-xs text-slate-400 mt-1">
              {productMetrics
                ? `Durable database source · ${productMetrics.dataQuality.metricWindowDays}-day activity window`
                : productMetricsError
                  ? 'Analytics data is unavailable for this admin session.'
                  : 'Loading sourced product metrics…'}
            </p>
          </div>
          {productMetrics && (
            <p className="text-xs text-slate-500">
              Updated {new Date(productMetrics.generatedAt).toLocaleString()}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <AnalyticsCard title="Tracked signups" value={formatCount(productMetrics?.activation.totalSignups)} detail="All-time signup events" />
          <AnalyticsCard title="Activated signups" value={formatCount(productMetrics?.activation.firstCivicActionCount)} detail={formatPercent(productMetrics?.activation.activationRatePercent)} />
          <AnalyticsCard title="DAU" value={formatCount(productMetrics?.retention.dau)} detail="Distinct observed users · 1 day" />
          <AnalyticsCard title="MAU" value={formatCount(productMetrics?.retention.mau)} detail="Distinct observed users · 30 days" />
          <AnalyticsCard title="WAU" value={formatCount(productMetrics?.retention.wau)} detail="Distinct observed users · 7 days" />
          <AnalyticsCard title="Sessions" value={formatCount(productMetrics?.engagement.totalSessions)} detail="Observed sessions · 30 days" />
          <AnalyticsCard title="Civic interactions" value={formatCount(productMetrics?.engagement.totalCivicInteractions)} detail="Selected actions · 30 days" />
          <AnalyticsCard title="Interactions / session" value={productMetrics?.engagement.avgInteractionsPerSession == null ? 'Unavailable' : productMetrics.engagement.avgInteractionsPerSession.toFixed(2)} detail="Observed events / sessions" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800 bg-[#0A0A1A] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Top active constituencies</h3>
            {productMetrics?.geographyDensity.topActiveConstituencies.length ? (
              <div className="space-y-2">
                {productMetrics.geographyDensity.topActiveConstituencies.map((item) => (
                  <div key={item.acId} className="flex justify-between gap-4 text-xs">
                    <span className="text-slate-300 truncate">{item.name} <span className="text-slate-500">({item.acId})</span></span>
                    <span className="text-slate-400 shrink-0">{formatCount(item.activeUsers)} users · {formatCount(item.eventCount)} events</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">{productMetrics ? 'No constituency activity was recorded in this window.' : 'Unavailable'}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A0A1A] p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-200">Monetization data</h3>
            <div className="grid grid-cols-2 gap-3">
              <AnalyticsCard title="Subscription MRR" value={formatCurrency(productMetrics?.revenue.b2bSubscriptionMrrINR)} detail="Unavailable without billing ledger" />
              <AnalyticsCard title="Ad revenue" value={formatCurrency(productMetrics?.revenue.adRevenueINR)} detail="Unavailable without reconciled ad billing" />
              <AnalyticsCard title="Prepaid wallet balances" value={formatCurrency(productMetrics?.revenue.totalPrepaidBalancesINR)} detail="Customer liabilities · not revenue" />
              <AnalyticsCard title="ARPU" value={formatCurrency(productMetrics?.revenue.arpuINR)} detail="Unavailable until billing is reconciled" />
            </div>
          </div>
        </div>

        {productMetrics && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <h3 className="text-xs font-bold text-amber-200 mb-2">Data coverage and limitations</h3>
            <ul className="space-y-1 list-disc pl-4 text-xs text-amber-100/70">
              {productMetrics.dataQuality.notes.map((note, index) => <li key={index}>{note}</li>)}
            </ul>
            <p className="text-[11px] text-slate-500 mt-3">
              First stored analytics event: {productMetrics.dataQuality.analyticsCoverageStart
                ? new Date(productMetrics.dataQuality.analyticsCoverageStart).toLocaleString()
                : 'None recorded'}
            </p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-slate-600" />
            <h2 className="font-bold text-white text-base">Live streams</h2>
          </div>
          <div className="rounded-xl border border-slate-800 bg-[#0A0A1A] p-8 text-center space-y-2">
            <Radio className="w-8 h-8 text-slate-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">Stream inventory is not connected</p>
            <p className="text-xs text-slate-400">No stream names, viewer counts, or live status are shown until the API provides them.</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-400" />
            <h2 className="font-bold text-white text-base">API status</h2>
          </div>
          <div className="rounded-xl bg-slate-900/80 border border-slate-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold">
              {health && !healthError ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-amber-400" />}
              <span className="text-slate-200">{health ? health.status : healthError ? 'Unavailable' : 'Checking'}</span>
            </div>
            <p className="text-xs text-slate-400">{health ? `${health.service} · version ${health.version}` : 'The health endpoint has not returned a result.'}</p>
            {health?.uptime !== undefined && <p className="text-xs text-slate-400">Reported uptime: {Math.floor(health.uptime)} seconds</p>}
          </div>
          <p className="text-xs text-slate-500">Database, media ingest, and client build status are not reported by this health endpoint.</p>
          <Link to="/system-health" className="block text-center py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold text-xs border border-slate-700/60 transition">
            View diagnostics →
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number | null | undefined) {
  return value == null
    ? 'Unavailable'
    : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);
}

function AnalyticsCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 min-w-0">
      <p className="text-[11px] text-slate-400 font-medium truncate">{title}</p>
      <p className="text-lg font-bold text-white mt-1 truncate" title={value}>{value}</p>
      <p className="text-[10px] text-slate-500 mt-1">{detail}</p>
    </div>
  );
}

function MetricCard({ title, icon, value, detail }: { title: string; icon: React.ReactNode; value: string; detail: string }) {
  return (
    <div className="bg-[#111827] border border-slate-800 p-5 rounded-2xl relative overflow-hidden">
      <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-3">
        <span>{title}</span>{icon}
      </div>
      <div className="text-2xl font-extrabold text-white tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 font-medium mt-2">{detail}</div>
    </div>
  );
}
