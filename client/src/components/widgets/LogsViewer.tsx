/* ── LogsViewer – terminal-style live log viewer ───────────── */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { get } from '@/lib/api';

interface LogSource {
  name: string;
  type: string;
}

interface TailResponse {
  source: string;
  lines: string[];
}

const levelColors: Record<string, string> = {
  error: 'text-neo-red',
  err: 'text-neo-red',
  warn: 'text-neo-yellow',
  warning: 'text-neo-yellow',
  info: 'text-neo-cyan',
  debug: 'text-neo-text-disabled',
};

function getLineColor(line: string): string {
  const lower = line.toLowerCase();
  for (const [key, color] of Object.entries(levelColors)) {
    if (lower.includes(key)) return color;
  }
  return 'text-neo-text-secondary';
}

export function LogsViewer() {
  const [sources, setSources] = useState<LogSource[]>([]);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load sources
  useEffect(() => {
    get<LogSource[]>('/chef/logs/files')
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setSources(list);
        if (list.length > 0 && !activeSource) {
          setActiveSource(list[0]!.name);
        }
      })
      .catch(() => setSources([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll tail
  const fetchTail = useCallback(async () => {
    if (!activeSource) return;
    try {
      const data = await get<TailResponse>(
        `/chef/logs/tail/${encodeURIComponent(activeSource)}?lines=100`,
      );
      setLines(data.lines ?? []);
    } catch {
      // Keep existing lines
    }
  }, [activeSource]);

  useEffect(() => {
    if (!activeSource) return;
    setLoading(true);
    fetchTail().finally(() => setLoading(false));

    pollRef.current = setInterval(fetchTail, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeSource, fetchTail]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const filteredLines = search
    ? lines.filter((l) => l.toLowerCase().includes(search.toLowerCase()))
    : lines;

  return (
    <Card title="Logs" loading={loading && lines.length === 0} glowColor="red">
      <div className="space-y-2">
        {/* Source selector + search */}
        <div className="flex gap-2">
          <select
            value={activeSource ?? ''}
            onChange={(e) => {
              setActiveSource(e.target.value);
              setLines([]);
            }}
            className="bg-neo-bg-deep border border-neo-border text-[10px] font-mono text-neo-text-primary px-2 py-1 focus:border-neo-cyan focus:outline-none"
          >
            {sources.map((s) => (
              <option key={s.name} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>

          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter..."
            className="flex-1 bg-neo-bg-deep border border-neo-border px-2 py-1 text-[10px] font-mono text-neo-text-primary placeholder:text-neo-text-disabled focus:border-neo-cyan focus:outline-none"
          />
        </div>

        {/* Log output */}
        <div
          ref={scrollRef}
          className="bg-neo-bg-deep border border-neo-border p-2 h-52 overflow-auto"
        >
          {filteredLines.length > 0 ? (
            filteredLines.map((line, i) => (
              <div
                key={i}
                className={`text-[10px] font-mono leading-relaxed break-all ${getLineColor(line)}`}
              >
                {line}
              </div>
            ))
          ) : (
            <p className="text-[10px] font-mono text-neo-text-disabled">
              {loading ? 'Loading...' : 'No log entries.'}
            </p>
          )}
        </div>

        {/* Line count */}
        <div className="flex justify-between text-[10px] font-mono text-neo-text-disabled">
          <span>{filteredLines.length} lines</span>
          {search && <span>filtered from {lines.length}</span>}
        </div>
      </div>
    </Card>
  );
}
