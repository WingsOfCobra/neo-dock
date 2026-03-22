/* ── LogsViewer – Loki-powered log viewer with categories ──── */

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';
import { useMetricsStore } from '@/stores/metricsStore';
import type { LokiLogEntry } from '@/types';

/* ── Log level detection ─────────────────────────────────────── */

type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'unknown';

const LEVEL_PATTERNS: Array<[LogLevel, RegExp]> = [
  ['error', /\b(error|err|fatal|panic|crit|critical|exception|fail)\b/i],
  ['warn', /\b(warn|warning)\b/i],
  ['info', /\b(info|notice)\b/i],
  ['debug', /\b(debug|trace|verbose)\b/i],
];

function detectLevel(line: string, labels: Record<string, string>): LogLevel {
  // Check label first (some sources set level explicitly)
  const labelLevel = labels['level'] ?? labels['severity'] ?? '';
  if (labelLevel) {
    const lower = labelLevel.toLowerCase();
    if (lower.includes('err') || lower.includes('fatal') || lower.includes('crit')) return 'error';
    if (lower.includes('warn')) return 'warn';
    if (lower.includes('info')) return 'info';
    if (lower.includes('debug') || lower.includes('trace')) return 'debug';
  }

  // Fall back to pattern matching on the line
  for (const [level, pattern] of LEVEL_PATTERNS) {
    if (pattern.test(line)) return level;
  }
  return 'unknown';
}

const LEVEL_COLORS: Record<LogLevel, string> = {
  error: 'text-neo-red',
  warn: 'text-neo-yellow',
  info: 'text-neo-text-primary',
  debug: 'text-neo-text-disabled',
  unknown: 'text-neo-text-secondary',
};

const LEVEL_BADGES: Record<LogLevel, string> = {
  error: 'bg-neo-red/20 text-neo-red border-neo-red/40',
  warn: 'bg-neo-yellow/20 text-neo-yellow border-neo-yellow/40',
  info: 'bg-neo-red/10 text-neo-text-primary border-neo-border',
  debug: 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border',
  unknown: 'bg-neo-bg-elevated text-neo-text-disabled border-neo-border',
};

/* ── Category helpers ────────────────────────────────────────── */

interface LokiLabelValues {
  data?: string[];
}

/* ── Processed log entry ─────────────────────────────────────── */

interface ProcessedLog {
  timestamp: string;
  time: string;
  line: string;
  level: LogLevel;
  labels: Record<string, string>;
  source: string;
}

function processEntry(entry: LokiLogEntry): ProcessedLog {
  const level = detectLevel(entry.line, entry.labels);
  const tsMs = Number(BigInt(entry.timestamp) / 1_000_000n);
  const date = new Date(tsMs);
  const time = date.toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const source = entry.labels['job'] ?? entry.labels['container_name'] ?? entry.labels['unit'] ?? entry.labels['filename'] ?? 'unknown';

  return {
    timestamp: entry.timestamp,
    time,
    line: entry.line,
    level,
    labels: entry.labels,
    source,
  };
}

/* ── Fullscreen hook ──────────────────────────────────────────── */

function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!ref.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      ref.current.requestFullscreen();
    }
  }, [ref]);

  return { isFullscreen, toggle };
}

/* ── Component ───────────────────────────────────────────────── */

interface LogsViewerProps {
  fullHeight?: boolean;
}

export function LogsViewer({ fullHeight = false }: LogsViewerProps) {
  // Live tail from WebSocket
  const lokiLogs = useMetricsStore((s) => s.lokiLogs);
  const lokiLabels = useMetricsStore((s) => s.lokiLabels);

  // Historical logs from REST query
  const [historicalLogs, setHistoricalLogs] = useState<LokiLogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categoryValues, setCategoryValues] = useState<string[]>([]);
  const [selectedValue, setSelectedValue] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [search, setSearch] = useState('');
  const [liveTail, setLiveTail] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  // When a category label is selected, fetch its possible values
  useEffect(() => {
    if (selectedCategory === 'all') {
      setCategoryValues([]);
      setSelectedValue('all');
      return;
    }

    get<LokiLabelValues>(`/loki/label/${encodeURIComponent(selectedCategory)}/values`)
      .then((data) => {
        setCategoryValues(data?.data ?? []);
      })
      .catch(() => setCategoryValues([]));
  }, [selectedCategory]);

  // Fetch historical logs when filters change (not in live tail mode)
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let logqlQuery: string;
      if (selectedCategory !== 'all' && selectedValue !== 'all') {
        logqlQuery = `{${selectedCategory}="${selectedValue}"}`;
      } else if (selectedCategory !== 'all') {
        logqlQuery = `{${selectedCategory}=~".+"}`;
      } else {
        logqlQuery = '{job=~".+"}';
      }

      // Add search filter in LogQL
      if (search) {
        logqlQuery += ` |~ \`(?i)${search}\``;
      }

      // Add level filter
      if (levelFilter !== 'all') {
        logqlQuery += ` |~ \`(?i)${levelFilter}\``;
      }

      const params = new URLSearchParams({
        query: logqlQuery,
        limit: '200',
        direction: 'backward',
      });

      const resp = await get<{
        data?: {
          result?: Array<{
            stream: Record<string, string>;
            values: Array<[string, string]>;
          }>;
        };
      }>(`/loki/query_range?${params.toString()}`);

      const streams = resp?.data?.result ?? [];
      const entries: LokiLogEntry[] = [];
      for (const stream of streams) {
        for (const [ts, line] of stream.values) {
          entries.push({ timestamp: ts, line, labels: stream.stream });
        }
      }

      // Sort ascending by timestamp
      entries.sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
      setHistoricalLogs(entries);
    } catch {
      setHistoricalLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedValue, search, levelFilter]);

  // Fetch on mount and when switching away from live tail
  useEffect(() => {
    if (!liveTail) {
      fetchLogs();
    }
  }, [liveTail, fetchLogs]);

  // Process logs for display
  const displayLogs = useMemo(() => {
    const raw = liveTail ? lokiLogs : historicalLogs;
    let processed = raw.map(processEntry);

    // Apply client-side filters on live tail data
    if (liveTail) {
      if (selectedCategory !== 'all' && selectedValue !== 'all') {
        processed = processed.filter((l) => l.labels[selectedCategory] === selectedValue);
      }
      if (levelFilter !== 'all') {
        processed = processed.filter((l) => l.level === levelFilter);
      }
      if (search) {
        const lower = search.toLowerCase();
        processed = processed.filter((l) => l.line.toLowerCase().includes(lower));
      }
    }

    return processed;
  }, [liveTail, lokiLogs, historicalLogs, selectedCategory, selectedValue, levelFilter, search]);

  // Level counts for the category bar
  const levelCounts = useMemo(() => {
    const counts = { error: 0, warn: 0, info: 0, debug: 0, unknown: 0 };
    for (const log of displayLogs) {
      counts[log.level]++;
    }
    return counts;
  }, [displayLogs]);

  // Auto-scroll in live tail mode
  useEffect(() => {
    if (liveTail && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayLogs, liveTail]);

  // Filter category labels — show useful ones
  const usefulLabels = useMemo(() => {
    const skip = new Set(['__name__', 'instance', 'host']);
    return lokiLabels.filter((l) => !skip.has(l));
  }, [lokiLabels]);

  const containerHeight = isFullscreen
    ? 'h-[calc(100vh-120px)]'
    : fullHeight
      ? 'h-[calc(100vh-220px)]'
      : 'h-64';

  return (
    <div ref={containerRef} className={isFullscreen ? 'bg-neo-bg-deep p-2' : ''}>
    <Card title="Loki Logs" loading={loading && displayLogs.length === 0}>
      <div className="space-y-2">
        {/* Controls row 1: Category + Value */}
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setSelectedValue('all');
            }}
            className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-red focus:outline-none"
          >
            <option value="all">ALL SOURCES</option>
            {usefulLabels.map((label) => (
              <option key={label} value={label}>
                {label.toUpperCase()}
              </option>
            ))}
          </select>

          {categoryValues.length > 0 && (
            <select
              value={selectedValue}
              onChange={(e) => setSelectedValue(e.target.value)}
              className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-red focus:outline-none"
            >
              <option value="all">ALL</option>
              {categoryValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
            className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-red focus:outline-none"
          >
            <option value="all">ALL LEVELS</option>
            <option value="error">ERROR ({levelCounts.error})</option>
            <option value="warn">WARN ({levelCounts.warn})</option>
            <option value="info">INFO ({levelCounts.info})</option>
            <option value="debug">DEBUG ({levelCounts.debug})</option>
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="flex-1 min-w-[100px] bg-neo-bg-deep border border-neo-border px-2 py-1 text-[10px] font-mono text-neo-text-primary placeholder:text-neo-text-disabled focus:border-neo-red focus:outline-none"
          />
        </div>

        {/* Controls row 2: Live tail toggle + stats */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLiveTail(!liveTail)}
            className={`px-2 py-1 text-[10px] font-mono uppercase border transition-colors ${
              liveTail
                ? 'border-neo-red text-neo-red bg-neo-red/10'
                : 'border-neo-border text-neo-text-disabled hover:border-neo-red/40 hover:text-neo-red/60'
            }`}
          >
            {liveTail ? '> LIVE TAIL' : '  PAUSED'}
          </button>

          {liveTail && (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-neo-red animate-pulse shadow-[0_0_4px_rgba(255,0,51,0.5)]" />
              <span className="text-[9px] font-mono text-neo-red/60">STREAMING</span>
            </span>
          )}

          {!liveTail && (
            <button
              onClick={fetchLogs}
              className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors"
            >
              REFRESH
            </button>
          )}

          <div className="flex-1" />

          {/* Level summary badges */}
          <div className="flex items-center gap-1.5">
            {levelCounts.error > 0 && (
              <span className="text-[9px] font-mono text-neo-red">
                {levelCounts.error} ERR
              </span>
            )}
            {levelCounts.warn > 0 && (
              <span className="text-[9px] font-mono text-neo-yellow">
                {levelCounts.warn} WRN
              </span>
            )}
            <span className="text-[9px] font-mono text-neo-text-disabled">
              {displayLogs.length} lines
            </span>
          </div>

          <button
            onClick={toggleFullscreen}
            className="px-2 py-1 text-[10px] font-mono uppercase border border-neo-border text-neo-text-disabled hover:text-neo-red hover:border-neo-red/40 transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? 'EXIT' : 'FULL'}
          </button>
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          className={`bg-neo-bg-deep border border-neo-border p-2 ${containerHeight} overflow-auto`}
        >
          {displayLogs.length > 0 ? (
            displayLogs.map((log, i) => (
              <div
                key={`${log.timestamp}-${i}`}
                className={`flex gap-2 text-[10px] font-mono leading-relaxed hover:bg-neo-red/[0.03] ${LEVEL_COLORS[log.level]}`}
              >
                <span className="text-neo-text-disabled shrink-0 select-none w-14">
                  {log.time}
                </span>
                <span
                  className={`shrink-0 w-8 text-center px-0.5 py-px border text-[8px] uppercase ${LEVEL_BADGES[log.level]}`}
                >
                  {log.level === 'unknown' ? '---' : log.level.slice(0, 3)}
                </span>
                <span className="text-neo-red/40 shrink-0 w-20 truncate" title={log.source}>
                  {log.source}
                </span>
                <span className="break-all">{log.line}</span>
              </div>
            ))
          ) : (
            <p className="text-[10px] font-mono text-neo-text-disabled">
              {loading ? '> Loading..._' : '> No log entries._'}
            </p>
          )}
        </div>
      </div>
    </Card>
    </div>
  );
}
