/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  BarChart, Cpu, Globe, Database, HelpCircle, RefreshCw, Zap, TrendingUp, AlertTriangle
} from 'lucide-react';
import { SearchStats, SearchHistoryItem } from '../types';

interface StatsPageProps {
  setDbCount: (n: number) => void;
}

export default function StatsPage({ setDbCount }: StatsPageProps) {
  const [stats, setStats] = useState<SearchStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
        if (data.searchHistory) {
          // also set the OUI database size
          const regRes = await fetch('/api/admin/vendors');
          if (regRes.ok) {
            const regData = await regRes.json();
            setDbCount(regData.length);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load telemetry stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handlePurgeHistory = async () => {
    if (!confirm('Are you absolutely sure you want to purge all search history and network stats? This action cannot be reversed.')) {
      return;
    }
    try {
      const res = await fetch('/api/stats/clear', { method: 'POST' });
      if (res.ok) {
        fetchStats();
      }
    } catch (err) {
      console.error('Failed to clear search history', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-10 text-center space-y-4">
        <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin mx-auto" />
        <p className="font-mono text-xs text-slate-400 uppercase tracking-widest">Parsing Telemetry Records...</p>
      </div>
    );
  }

  // Pre-calculate data if stats is empty or available
  const totalQueries = stats?.totalSearches || 0;
  const localDbMatches = stats?.localMatches || 0;
  const liveApiMatches = stats?.liveMatches || 0;
  const failedMatches = stats?.failedMatches || 0;

  // Pie chart calculation for OUI matching sources
  const sourcePieData = [
    { label: 'Local DB', value: localDbMatches, color: '#06b6d4' },
    { label: 'Live APIs', value: liveApiMatches, color: '#3b82f6' },
    { label: 'Unresolved', value: failedMatches, color: '#ef4444' }
  ];

  const validPieData = sourcePieData.filter(d => d.value > 0);
  const pieTotal = validPieData.reduce((acc, d) => acc + d.value, 0);

  // Top searched vendors counts
  const vendorCounts = stats?.vendorCounts || {};
  const sortedVendors = (Object.entries(vendorCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Top searched countries counts
  const countryCounts = stats?.countryCounts || {};
  const sortedCountries = (Object.entries(countryCounts) as [string, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Calculate coordinates for dynamic SVG Pie Chart
  let accumulatedAngle = 0;
  const pieSlices = validPieData.map((slice) => {
    const angle = (slice.value / pieTotal) * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;

    // Convert polar coordinates to Cartesian
    const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    };

    const start = polarToCartesian(100, 100, 70, startAngle);
    const end = polarToCartesian(100, 100, 70, startAngle + angle);
    const largeArcFlag = angle > 180 ? 1 : 0;

    // SVG path d attribute
    const pathData = [
      `M 100 100`,
      `L ${start.x} ${start.y}`,
      `A 70 70 0 ${largeArcFlag} 1 ${end.x} ${end.y}`,
      'Z'
    ].join(' ');

    return {
      pathData,
      color: slice.color,
      label: slice.label,
      value: slice.value,
      percentage: ((slice.value / pieTotal) * 100).toFixed(1)
    };
  });

  return (
    <div className="w-full space-y-8 max-w-6xl mx-auto">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-900 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-100 uppercase tracking-tight">
            Query Telemetry & Analytics
          </h3>
          <p className="text-xs text-slate-400">
            Real-time inspection of matched vendor caches, database lookups, and global networking telemetry.
          </p>
        </div>
        
        {totalQueries > 0 && (
          <button
            onClick={handlePurgeHistory}
            className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-rose-400 font-mono text-[10px] uppercase tracking-wider hover:bg-rose-500 hover:text-slate-950 transition-all"
          >
            Purge History Data
          </button>
        )}
      </div>

      {totalQueries === 0 ? (
        <div className="cyber-card p-12 rounded-2xl text-center space-y-4">
          <TrendingUp className="h-10 w-10 text-slate-600 mx-auto" />
          <div className="space-y-1">
            <h4 className="font-display font-semibold text-sm text-slate-300 uppercase">No Telemetry Recorded</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Please enter and scan MAC addresses inside the core Analyzer tab. The system will compile and render stats visualizations.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Bento Grid Analytics Counters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bento-card p-5 space-y-2 relative overflow-hidden border border-slate-800">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-cyan-950/20 flex items-center justify-center border border-cyan-500/10">
                <Cpu className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Total Lookups</p>
              <h3 className="text-3xl font-extrabold text-slate-100 font-display">{totalQueries}</h3>
              <p className="text-[10px] text-slate-500">Queries resolved since boot.</p>
            </div>

            <div className="bento-card p-5 space-y-2 relative overflow-hidden border border-slate-800">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-emerald-950/20 flex items-center justify-center border border-emerald-500/10">
                <Database className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Local DB Hits</p>
              <h3 className="text-3xl font-extrabold text-slate-100 font-display">{localDbMatches}</h3>
              <p className="text-[10px] text-emerald-500 font-semibold font-mono">
                {((localDbMatches / totalQueries) * 100).toFixed(1)}% Local Cache rate
              </p>
            </div>

            <div className="bento-card p-5 space-y-2 relative overflow-hidden border border-slate-800">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-blue-950/20 flex items-center justify-center border border-blue-500/10">
                <Globe className="h-4 w-4 text-blue-400" />
              </div>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Live API Resolved</p>
              <h3 className="text-3xl font-extrabold text-slate-100 font-display">{liveApiMatches}</h3>
              <p className="text-[10px] text-blue-500 font-mono">
                {((liveApiMatches / totalQueries) * 100).toFixed(1)}% WAN Fetch rate
              </p>
            </div>

            <div className="bento-card p-5 space-y-2 relative overflow-hidden border border-slate-800">
              <div className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-rose-950/20 flex items-center justify-center border border-rose-500/10">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
              </div>
              <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Unresolved MACs</p>
              <h3 className="text-3xl font-extrabold text-slate-100 font-display">{failedMatches}</h3>
              <p className="text-[10px] text-rose-500 font-mono">
                {((failedMatches / totalQueries) * 100).toFixed(1)}% Fail registry rate
              </p>
            </div>

          </div>

          {/* Interactive Graphics Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pie Chart SVG: Database Matching Source */}
            <div className="bento-card p-5 space-y-4 border border-slate-800">
              <h4 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-2">OUI Resolution Sources</h4>
              
              <div className="flex flex-col items-center justify-center py-6 space-y-4">
                {pieTotal > 0 ? (
                  <svg className="h-44 w-44 filter drop-shadow-[0_0_12px_rgba(6,182,212,0.15)]" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="70" fill="transparent" stroke="rgba(15, 23, 42, 0.5)" strokeWidth="6" />
                    {pieSlices.map((slice, idx) => (
                      <path
                        key={idx}
                        d={slice.pathData}
                        fill={slice.color}
                        className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                        title={`${slice.label}: ${slice.value}`}
                      />
                    ))}
                    {/* Centered cut-out for donut chart appearance */}
                    <circle cx="100" cy="100" r="45" fill="#0b1329" />
                    <text x="100" y="98" textAnchor="middle" fill="#94a3b8" className="font-mono text-[10px] uppercase font-bold">Matched</text>
                    <text x="100" y="115" textAnchor="middle" fill="#f8fafc" className="font-display text-base font-extrabold">{totalQueries}</text>
                  </svg>
                ) : (
                  <div className="h-44 flex items-center justify-center text-xs text-slate-500">Calculations Pending</div>
                )}
 
                {/* Legends */}
                <div className="w-full space-y-2 pt-2">
                  {sourcePieData.map((legend, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: legend.color }} />
                        <span className="text-slate-400 font-mono">{legend.label}</span>
                      </div>
                      <span className="text-slate-300 font-semibold">{legend.value} queries ({totalQueries > 0 ? ((legend.value / totalQueries) * 100).toFixed(0) : 0}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
 
            {/* Bar Chart SVG: Top Searched Vendors */}
            <div className="bento-card p-5 lg:col-span-2 space-y-4 border border-slate-800">
              <h4 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest border-b border-slate-900/60 pb-2">Top Queried Vendors</h4>
              
              <div className="space-y-4 py-2">
                {sortedVendors.length > 0 ? (
                  sortedVendors.map(([vendor, count], idx) => {
                    const maxVal = Math.max(...sortedVendors.map(v => v[1]));
                    const percentage = maxVal > 0 ? (count / maxVal) * 100 : 0;
                    return (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-sans font-medium truncate max-w-[200px] sm:max-w-md">{vendor}</span>
                          <span className="text-cyan-400 font-mono font-bold">{count} Lookups</span>
                        </div>
                        {/* Custom horizontal bars */}
                        <div className="h-3 w-full rounded-lg bg-slate-900 overflow-hidden border border-slate-800 flex items-center">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-lg transition-all duration-700"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-20 text-center text-xs text-slate-500">Telemetry buffers compiling...</div>
                )}
              </div>
            </div>
 
          </div>
 
          {/* Historical Search Log Table */}
          <div className="bento-card overflow-hidden border border-slate-800 shadow-xl">
            <div className="p-5 border-b border-slate-900/60 bg-slate-950/40">
              <h4 className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Active Audit Log Vault</h4>
            </div>
            
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-950 text-slate-500 border-b border-slate-900 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Timestamp</th>
                    <th className="p-4">Physical MAC Address</th>
                    <th className="p-4">Resolved Vendor</th>
                    <th className="p-4">Telemetry Match</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900 text-slate-300">
                  {stats.searchHistory.slice(0, 15).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="p-4 text-cyan-400 font-semibold">{log.mac}</td>
                      <td className="p-4 truncate max-w-[200px]" title={log.vendor}>{log.vendor}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] border font-bold uppercase ${
                          log.databaseMatch === 'Local Database'
                            ? 'border-emerald-500/20 bg-emerald-950/10 text-emerald-400'
                            : log.databaseMatch === 'Live API'
                            ? 'border-cyan-500/20 bg-cyan-950/10 text-cyan-400'
                            : 'border-yellow-500/20 bg-yellow-950/10 text-yellow-400'
                        }`}>
                          {log.databaseMatch}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {stats.searchHistory.length > 15 && (
              <div className="p-3 text-center bg-slate-950 text-[10px] text-slate-500 border-t border-slate-900 font-mono">
                Displaying most recent 15 records of {stats.searchHistory.length} query records.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
