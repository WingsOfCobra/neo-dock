/* ── AnsiblePage – Ansible playbook management ────────────────── */

import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface Playbook {
  name: string;
  path?: string;
  description?: string;
}

interface AnsibleJob {
  id: number | string;
  playbook: string;
  status: 'running' | 'success' | 'failed' | 'pending';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
}

interface InventoryItem {
  name: string;
  groups?: string[];
  vars?: Record<string, unknown>;
}

export function AnsiblePage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [jobs, setJobs] = useState<AnsibleJob[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedPlaybook, setSelectedPlaybook] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'playbooks' | 'jobs' | 'inventory'>('playbooks');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setError(null);
      const [playbooksData, jobsData, inventoryData] = await Promise.allSettled([
        get<Playbook[]>('/chef/ansible/playbooks'),
        get<AnsibleJob[]>('/chef/ansible/jobs'),
        get<InventoryItem[]>('/chef/ansible/inventory'),
      ]);

      if (playbooksData.status === 'fulfilled') setPlaybooks(playbooksData.value);
      if (jobsData.status === 'fulfilled') setJobs(jobsData.value);
      if (inventoryData.status === 'fulfilled') setInventory(inventoryData.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Ansible data');
    }
  }

  async function handleRunPlaybook(name: string) {
    setRunning(true);
    setError(null);

    try {
      const result = await post<AnsibleJob>(`/chef/ansible/playbooks/${encodeURIComponent(name)}/run`, {});
      setJobs((prev) => [result, ...prev]);
      setActiveTab('jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run playbook');
    } finally {
      setRunning(false);
    }
  }

  const jobStatusColor = (status: AnsibleJob['status']) => {
    switch (status) {
      case 'success':
        return 'text-neo-green';
      case 'failed':
        return 'text-neo-red';
      case 'running':
        return 'text-neo-yellow';
      default:
        return 'text-neo-cyan';
    }
  };

  const jobStatusSymbol = (status: AnsibleJob['status']) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'failed':
        return '✕';
      case 'running':
        return '⟳';
      default:
        return '◆';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-[0.2em] text-neo-cyan">
          ◈ Ansible Automation
        </h1>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-xs font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 border border-neo-red/50 bg-neo-red/5">
          <p className="text-xs font-mono text-neo-red">⚠ {error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neo-border">
        <button
          onClick={() => setActiveTab('playbooks')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'playbooks'
              ? 'text-neo-cyan border-b-2 border-neo-cyan'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◈ Playbooks
        </button>
        <button
          onClick={() => setActiveTab('jobs')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'jobs'
              ? 'text-neo-cyan border-b-2 border-neo-cyan'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◆ Job History
        </button>
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'inventory'
              ? 'text-neo-cyan border-b-2 border-neo-cyan'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◇ Inventory
        </button>
      </div>

      {/* Playbooks Tab */}
      {activeTab === 'playbooks' && (
        <Card title="Available Playbooks" glowColor="cyan">
          <div className="space-y-2">
            {playbooks.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">
                No playbooks found. Configure ANSIBLE_PLAYBOOK_DIR in .env
              </p>
            ) : (
              playbooks.map((playbook) => (
                <div
                  key={playbook.name}
                  className="flex items-center justify-between p-3 border border-neo-border hover:border-neo-cyan/50 transition-colors"
                >
                  <div>
                    <div className="text-xs font-mono text-neo-text-primary mb-1">{playbook.name}</div>
                    {playbook.description && (
                      <div className="text-[10px] font-mono text-neo-text-secondary">
                        {playbook.description}
                      </div>
                    )}
                    {playbook.path && (
                      <div className="text-[10px] font-mono text-neo-text-secondary/50 mt-1">
                        {playbook.path}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleRunPlaybook(playbook.name)}
                    disabled={running}
                    className="px-3 py-1.5 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {running ? '⟳' : '▶'} Run
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Jobs Tab */}
      {activeTab === 'jobs' && (
        <Card title="Job History" glowColor="yellow">
          <div className="space-y-2">
            {jobs.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">No jobs executed yet</p>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="p-3 border border-neo-border hover:border-neo-cyan/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-neo-text-primary">{job.playbook}</span>
                    <span className={`text-xs font-mono uppercase ${jobStatusColor(job.status)}`}>
                      {jobStatusSymbol(job.status)} {job.status}
                    </span>
                  </div>

                  {job.startedAt && (
                    <div className="text-[10px] font-mono text-neo-text-secondary mb-1">
                      Started: {new Date(job.startedAt).toLocaleString()}
                    </div>
                  )}

                  {job.completedAt && (
                    <div className="text-[10px] font-mono text-neo-text-secondary mb-1">
                      Completed: {new Date(job.completedAt).toLocaleString()}
                    </div>
                  )}

                  {job.output && (
                    <details className="mt-2">
                      <summary className="text-[10px] font-mono text-neo-cyan cursor-pointer hover:text-neo-cyan/80">
                        ▸ View Output
                      </summary>
                      <pre className="mt-1 p-2 bg-neo-bg-elevated border border-neo-border text-[9px] font-mono text-neo-text-secondary whitespace-pre-wrap break-all max-h-48 overflow-y-auto">
                        {job.output}
                      </pre>
                    </details>
                  )}

                  {job.error && (
                    <div className="mt-2 p-2 border border-neo-red/30 bg-neo-red/5">
                      <p className="text-[10px] font-mono text-neo-red">{job.error}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Inventory Tab */}
      {activeTab === 'inventory' && (
        <Card title="Ansible Inventory" glowColor="green">
          <div className="space-y-2">
            {inventory.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">No inventory items found</p>
            ) : (
              inventory.map((item, idx) => (
                <div key={idx} className="p-3 border border-neo-border">
                  <div className="text-xs font-mono text-neo-text-primary mb-2">{item.name}</div>

                  {item.groups && item.groups.length > 0 && (
                    <div className="mb-2">
                      <span className="text-[10px] font-mono text-neo-text-secondary uppercase mr-2">
                        Groups:
                      </span>
                      {item.groups.map((group, gidx) => (
                        <span
                          key={gidx}
                          className="inline-block px-2 py-0.5 mr-1 text-[9px] font-mono bg-neo-cyan/10 border border-neo-cyan/30 text-neo-cyan"
                        >
                          {group}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.vars && Object.keys(item.vars).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-[10px] font-mono text-neo-cyan cursor-pointer hover:text-neo-cyan/80">
                        ▸ Variables
                      </summary>
                      <pre className="mt-1 p-2 bg-neo-bg-elevated border border-neo-border text-[9px] font-mono text-neo-text-secondary">
                        {JSON.stringify(item.vars, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
