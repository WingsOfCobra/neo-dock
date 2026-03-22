/* ── LogsViewer – Loki-powered log viewer with categories ──── */

import { useState, useEffect, useRef, useCallback, useMemo, type RefObject } from 'react';

function useDebounce<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';
import { useMetricsStore } from '@/stores/metricsStore';
import type { LokiLogEntry } from '@/types';

/* ── Source grouping ─────────────────────────────────────────── */

interface SourceGroup {
  label: string;
  emoji: string;
  // Which Loki label to filter on
  lokiLabel: string;
  // Static known members — shown even before label values load
  members?: string[];
}

// Groups are matched against compose_service / service_name values
const SOURCE_GROUPS: SourceGroup[] = [
  {
    label: 'Infrastructure',
    emoji: '🐳',
    lokiLabel: 'compose_service',
    members: ['chef-api', 'neo-dock', 'solcloud-docs', 'vaultwarden', 'postgres', 'pgadmin', 'portainer'],
  },
  {
    label: 'Automation',
    emoji: '⚙️',
    lokiLabel: 'compose_service',
    members: ['n8n', 'n8n-runner', 'n8n-worker'],
  },
  {
    label: 'Nextcloud',
    emoji: '☁️',
    lokiLabel: 'service_name',
    members: ['nextcloud-aio-mastercontainer', 'nextcloud-aio-apache', 'nextcloud-aio-collabora', 'nextcloud-aio-clamav', 'nextcloud-aio-redis', 'nextcloud-aio-talk', 'nextcloud-aio-notify-push', 'nextcloud-aio-whiteboard'],
  },
  {
    label: 'Monitoring',
    emoji: '📊',
    lokiLabel: 'compose_service',
    members: ['grafana', 'prometheus', 'loki', 'alertmanager', 'cadvisor', 'node-exporter', 'promtail'],
  },
  {
    label: 'Security',
    emoji: '🔒',
    lokiLabel: 'job',
    members: ['security'],
  },
  {
    label: 'Proxy & Network',
    emoji: '🌐',
    lokiLabel: 'service_name',
    members: ['proxy-manager-app-1'],
  },
];

// Map a service name to its group
function getGroupForService(service: string): SourceGroup | undefined {
  return SOURCE_GROUPS.find((g) => g.members?.some((m) => service.includes(m) || m.includes(service)));
}

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
  // Prefer compose_service (most descriptive), fall back through service_name, job, container_name, filename
  const source = entry.labels['compose_service'] ?? entry.labels['service_name'] ?? entry.labels['job'] ?? entry.labels['container_name'] ?? entry.labels['unit'] ?? entry.labels['filename'] ?? 'unknown';

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
  const [selectedGroup, setSelectedGroup] = useState<string>('all'); // group label or 'all'
  const [selectedService, setSelectedService] = useState<string>('all'); // specific service value or 'all'
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  // Legacy compat — map new state to old category/value for LogQL building
  const selectedCategory = useMemo(() => {
    if (selectedGroup === 'all' || selectedService === 'all') return 'all';
    const group = SOURCE_GROUPS.find((g) => g.label === selectedGroup);
    return group?.lokiLabel ?? 'all';
  }, [selectedGroup, selectedService]);
  const selectedValue = selectedService;
  const [search, setSearch] = useState('');
  const [liveTail, setLiveTail] = useState(true);

  // Debounce filter values to avoid hammering Loki on every keystroke
  const debouncedSearch = useDebounce(search, 500);
  const debouncedCategory = useDebounce(selectedGroup, 300); // group label for LogQL building
  const debouncedValue = useDebounce(selectedService, 300);
  const debouncedLevel = useDebounce(levelFilter, 300);

  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(containerRef);

  // When group changes, reset service selection
  useEffect(() => {
    setSelectedService('all');
  }, [selectedGroup]);

  // Services available in the selected group
  const availableServices = useMemo(() => {
    if (selectedGroup === 'all') return [];
    const group = SOURCE_GROUPS.find((g) => g.label === selectedGroup);
    return group?.members ?? [];
  }, [selectedGroup]);

  // Fetch historical logs when filters change (not in live tail mode)
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      let logqlQuery: string;
      const activeGroup = SOURCE_GROUPS.find((g) => g.label === debouncedCategory.replace(/^all$/, ''));

      if (activeGroup && debouncedValue !== 'all') {
        // Specific service within a group
        logqlQuery = `{${activeGroup.lokiLabel}="${debouncedValue}"}`;
      } else if (activeGroup && activeGroup.members && activeGroup.members.length > 0) {
        // Whole group — match any member via regex
        const pattern = activeGroup.members.map((m) => m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        logqlQuery = `{${activeGroup.lokiLabel}=~"${pattern}"}`;
      } else {
        // All sources — use compose_service (broader Docker coverage) + job (file-based)
        // We can't do OR in a single stream selector, so use compose_service which covers most
        logqlQuery = '{compose_service=~".+"}';
      }

      // Add search filter in LogQL
      if (debouncedSearch) {
        logqlQuery += ` |~ \`(?i)${debouncedSearch}\``;
      }

      // Add level filter
      if (debouncedLevel !== 'all') {
        logqlQuery += ` |~ \`(?i)${debouncedLevel}\``;
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
  }, [debouncedCategory, debouncedValue, debouncedSearch, debouncedLevel]);

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
      // Helper: get the "source" identifier from any stream label
      const getSource = (l: ReturnType<typeof processEntry>) =>
        l.labels['compose_service'] ?? l.labels['service_name'] ?? l.labels['job'] ?? '';

      if (selectedGroup !== 'all' && selectedService !== 'all') {
        // Specific service selected
        processed = processed.filter((l) => getSource(l) === selectedService);
      } else if (selectedGroup !== 'all') {
        // Whole group selected — match any member
        const group = SOURCE_GROUPS.find((g) => g.label === selectedGroup);
        if (group?.members) {
          processed = processed.filter((l) =>
            group.members!.some((m) => getSource(l) === m)
          );
        }
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
  }, [liveTail, lokiLogs, historicalLogs, selectedCategory, selectedService, selectedGroup, levelFilter, search]);

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

  // Suppress unused warning — lokiLabels still used for Loki availability check
  void lokiLabels;

  const containerHeight = isFullscreen
    ? 'h-[calc(100vh-120px)]'
    : fullHeight
      ? 'h-[calc(100vh-220px)]'
      : 'h-64';

  return (
    <div ref={containerRef} className={isFullscreen ? 'bg-neo-bg-deep p-2' : ''}>
    <Card title="Loki Logs" loading={loading && displayLogs.length === 0}>
      <div className="space-y-2">
        {/* Controls row 1: Group picker + Service picker */}
        <div className="flex gap-2 flex-wrap">
          {/* Group selector — categorized */}
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-red focus:outline-none"
          >
            <option value="all">ALL SOURCES</option>
            {SOURCE_GROUPS.map((g) => (
              <option key={g.label} value={g.label}>
                {g.emoji} {g.label.toUpperCase()}
              </option>
            ))}
          </select>

          {/* Service selector — shown when a group is selected */}
          {selectedGroup !== 'all' && availableServices.length > 0 && (
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-red focus:outline-none"
            >
              <option value="all">ALL IN GROUP</option>
              {availableServices.map((v) => (
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

        {/* Loki health indicator */}
        {!loading && lokiLabels.length === 0 && (
          <div className="flex items-center gap-2 px-2 py-1 bg-neo-yellow/5 border border-neo-yellow/20 font-mono text-[10px]">
            <span className="w-1.5 h-1.5 rounded-full bg-neo-yellow" />
            <span className="text-neo-yellow">LOKI UNAVAILABLE</span>
            <span className="text-neo-text-disabled">— check LOKI_URL config or Loki container</span>
          </div>
        )}

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
              {loading
                ? '> Loading..._'
                : liveTail
                  ? '> Awaiting log stream... (Loki may be unavailable or empty)_'
                  : '> No log entries._'}
            </p>
          )}
        </div>
      </div>
    </Card>
    </div>
  );
}
