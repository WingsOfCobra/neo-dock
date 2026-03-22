/* ── NetworkMonitor – bandwidth & interface stats widget ──── */

import { useMemo } from 'react';
import { useMetricsStore } from '@/stores/metricsStore';
import { Card } from '@/components/ui/Card';

interface NetworkMonitorProps {
  compact?: boolean;
}

/** Format bytes to human-readable string */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val < 10 ? 2 : val < 100 ? 1 : 0)} ${units[i]}`;
}

/** Format bytes/sec rate */
function formatRate(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

/** Tiny inline sparkline rendered as SVG */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const w = 80;
  const h = 20;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - (v / max) * h;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={w} height={h} className="inline-block align-middle opacity-70">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function NetworkMonitor({ compact = false }: NetworkMonitorProps) {
  const networkInterfaces = useMetricsStore((s) => s.networkInterfaces);
  const networkHistory = useMetricsStore((s) => s.networkHistory);
  const loading = networkInterfaces.length === 0;

  // Compute current rates from history deltas
  const { rxRate, txRate, rxRates, txRates } = useMemo(() => {
    if (networkHistory.length < 2) {
      return { rxRate: 0, txRate: 0, rxRates: [] as number[], txRates: [] as number[] };
    }

    const rxRatesArr: number[] = [];
    const txRatesArr: number[] = [];

    for (let i = 1; i < networkHistory.length; i++) {
      const dt = (networkHistory[i].timestamp - networkHistory[i - 1].timestamp) / 1000;
      if (dt <= 0) continue;
      const drx = networkHistory[i].rx_bytes - networkHistory[i - 1].rx_bytes;
      const dtx = networkHistory[i].tx_bytes - networkHistory[i - 1].tx_bytes;
      // Only count positive deltas (counter resets produce negative)
      rxRatesArr.push(drx > 0 ? drx / dt : 0);
      txRatesArr.push(dtx > 0 ? dtx / dt : 0);
    }

    const lastRx = rxRatesArr.length > 0 ? rxRatesArr[rxRatesArr.length - 1] : 0;
    const lastTx = txRatesArr.length > 0 ? txRatesArr[txRatesArr.length - 1] : 0;

    return { rxRate: lastRx, txRate: lastTx, rxRates: rxRatesArr, txRates: txRatesArr };
  }, [networkHistory]);

  // Compact mode: just total rates
  if (compact) {
    return (
      <Card title="Network" loading={loading} status={loading ? undefined : 'ok'}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-[9px] font-mono text-neo-text-disabled uppercase">Recv</p>
              <p className="text-sm font-mono text-neo-red">
                <span className="text-neo-red/60">↓</span> {formatRate(rxRate)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-[9px] font-mono text-neo-text-disabled uppercase">Send</p>
              <p className="text-sm font-mono text-neo-red">
                <span className="text-neo-red/60">↑</span> {formatRate(txRate)}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Sparkline data={rxRates.slice(-30)} color="#FF0033" />
            <Sparkline data={txRates.slice(-30)} color="#990020" />
          </div>
        </div>
        <div className="mt-2 text-[9px] font-mono text-neo-text-disabled">
          {networkInterfaces.length} interface{networkInterfaces.length !== 1 ? 's' : ''}
        </div>
      </Card>
    );
  }

  // Full mode: per-interface detail
  return (
    <Card title="Network Monitor" loading={loading} status={loading ? undefined : 'ok'}>
      {/* Global rate summary */}
      <div className="flex items-center gap-4 mb-3 pb-3 border-b border-neo-border">
        <div className="flex-1">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[9px] font-mono text-neo-text-disabled uppercase tracking-wider">
                Total Recv
              </p>
              <p className="text-lg font-mono text-neo-red leading-tight">
                <span className="text-neo-red/50">↓</span> {formatRate(rxRate)}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-mono text-neo-text-disabled uppercase tracking-wider">
                Total Send
              </p>
              <p className="text-lg font-mono text-neo-red leading-tight">
                <span className="text-neo-red/50">↑</span> {formatRate(txRate)}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neo-text-disabled">RX</span>
            <Sparkline data={rxRates.slice(-60)} color="#FF0033" />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[8px] font-mono text-neo-text-disabled">TX</span>
            <Sparkline data={txRates.slice(-60)} color="#990020" />
          </div>
        </div>
      </div>

      {/* Per-interface cards */}
      <div className="space-y-2">
        {networkInterfaces.map((iface) => (
          <div
            key={iface.name ?? 'unknown'}
            className="border border-neo-border bg-neo-bg-deep/30 px-3 py-2"
            style={{
              clipPath:
                'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))',
            }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-neo-red shadow-[0_0_4px_rgba(255,0,51,0.4)]" />
                <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-neo-text-primary">
                  {iface.name ?? 'unknown'}
                </span>
              </div>
              {iface.ipv4 && (
                <span className="font-mono text-[9px] text-neo-text-secondary">
                  {iface.ipv4}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
              <div>
                <span className="text-neo-text-disabled">↓ RX </span>
                <span className="text-neo-red">{formatBytes(iface.rx_bytes ?? 0)}</span>
              </div>
              <div>
                <span className="text-neo-text-disabled">↑ TX </span>
                <span className="text-neo-red">{formatBytes(iface.tx_bytes ?? 0)}</span>
              </div>
              <div>
                <span className="text-neo-text-disabled">RX PKT </span>
                <span className="text-neo-text-secondary">
                  {(iface.rx_packets ?? 0).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-neo-text-disabled">TX PKT </span>
                <span className="text-neo-text-secondary">
                  {(iface.tx_packets ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            {iface.ipv6 && (
              <div className="mt-1 text-[8px] font-mono text-neo-text-disabled truncate">
                IPv6: {iface.ipv6}
              </div>
            )}
          </div>
        ))}
      </div>

      {networkInterfaces.length === 0 && !loading && (
        <p className="text-xs text-neo-text-disabled text-center py-4 font-mono">
          No network interfaces detected.
        </p>
      )}
    </Card>
  );
}
