/* ── Chart – uPlot wrapper for time-series data ──────────── */

import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

interface ChartProps {
  data: uPlot.AlignedData;
  options: Omit<uPlot.Options, 'width' | 'height'>;
  width?: number;
  height?: number;
  className?: string;
}

export function Chart({
  data,
  options,
  width,
  height = 160,
  className = '',
}: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const w = width ?? el.clientWidth;

    const fullOpts: uPlot.Options = {
      ...options,
      width: w,
      height,
    };

    chartRef.current = new uPlot(fullOpts, data, el);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
    // Re-create chart only when options change meaningfully
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update data without recreating chart
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.setData(data);
    }
  }, [data]);

  // Handle resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !chartRef.current) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width;
        if (w > 0 && chartRef.current) {
          chartRef.current.setSize({ width: w, height });
        }
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  return <div ref={containerRef} className={className} />;
}
