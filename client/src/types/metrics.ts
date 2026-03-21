export interface SystemHealth {
  status: string;
  uptime: number;
  memory: { total: number; free: number; usedPercent: number };
  loadAvg: number[];
  timestamp: string;
  cpu?: number;
}

export interface DiskInfo {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usePercent: string;
  mountpoint: string;
}

export interface ProcessInfo {
  pid: number;
  user: string;
  cpuPercent: number;
  memPercent: number;
  command: string;
}

export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: string;
  created: string;
}

export interface ContainerStats {
  id: string;
  name: string;
  cpuPercent: number;
  memPercent: number;
  memUsage: string;
  netIO: string;
  blockIO: string;
}

export interface ServiceStatus {
  name: string;
  status: 'active' | 'inactive' | 'failed' | 'unknown';
}

export interface MetricsPoint {
  timestamp: number;
  cpu: number;
  memUsedPercent: number;
  loadAvg: number[];
}

export interface ContainerMetricsPoint {
  timestamp: number;
  cpuPercent: number;
  memPercent: number;
  memUsage: number;
}
