/* ── AlertsPage – Alert rules, events, and history ────────────── */

import { useEffect, useState } from 'react';
import { get, post, patch } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface AlertRule {
  id: number | string;
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
  description?: string;
}

interface AlertEvent {
  id: number | string;
  ruleId: number | string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  acknowledged?: boolean;
}

interface AlertHistory {
  id: number | string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  resolvedAt?: string;
}

export function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'events' | 'history'>('rules');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    condition: '',
    severity: 'warning' as AlertRule['severity'],
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setError(null);
      const [rulesData, eventsData, historyData] = await Promise.allSettled([
        get<AlertRule[]>('/chef/alerts/rules'),
        get<AlertEvent[]>('/chef/alerts/events'),
        get<AlertHistory[]>('/chef/alerts/history'),
      ]);

      if (rulesData.status === 'fulfilled') setRules(rulesData.value);
      if (eventsData.status === 'fulfilled') setEvents(eventsData.value);
      if (historyData.status === 'fulfilled') setHistory(historyData.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alerts data');
    }
  }

  async function handleToggleRule(ruleId: number | string, enabled: boolean) {
    setLoading(true);
    setError(null);

    try {
      await patch(`/chef/alerts/rules/${ruleId}`, { enabled: !enabled });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rule');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRule() {
    if (!newRule.name.trim() || !newRule.condition.trim()) {
      setError('Rule name and condition are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await post('/chef/alerts/rules', newRule);
      setShowAddModal(false);
      setNewRule({ name: '', condition: '', severity: 'warning', description: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setLoading(false);
    }
  }

  const severityColor = (severity: AlertRule['severity']) => {
    switch (severity) {
      case 'critical':
        return 'text-neo-red border-neo-red bg-neo-red/10';
      case 'error':
        return 'text-neo-red/80 border-neo-red/80 bg-neo-red/5';
      case 'warning':
        return 'text-neo-yellow border-neo-yellow/80 bg-neo-yellow/5';
      default:
        return 'text-neo-cyan border-neo-cyan/80 bg-neo-cyan/5';
    }
  };

  const severityBadge = (severity: AlertRule['severity']) => {
    switch (severity) {
      case 'critical':
        return '◆◆◆';
      case 'error':
        return '◆◆';
      case 'warning':
        return '◆';
      default:
        return '◇';
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-[0.2em] text-neo-cyan">
          ◈ Alert System
        </h1>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="px-3 py-1.5 text-xs font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
          >
            Refresh
          </button>
          {activeTab === 'rules' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase"
            >
              ◈ Add Rule
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 border border-neo-red/50 bg-neo-red/5">
          <p className="text-xs font-mono text-neo-red">⚠ {error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-neo-border">
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'rules'
              ? 'text-neo-cyan border-b-2 border-neo-cyan'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◈ Rules ({rules.length})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'events'
              ? 'text-neo-yellow border-b-2 border-neo-yellow'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◆ Active Events ({events.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-xs font-mono uppercase transition-colors ${
            activeTab === 'history'
              ? 'text-neo-green border-b-2 border-neo-green'
              : 'text-neo-text-secondary hover:text-neo-cyan'
          }`}
        >
          ◇ History (Last 100)
        </button>
      </div>

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <Card title="Alert Rules" glowColor="cyan">
          <div className="space-y-2">
            {rules.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">
                No alert rules configured. Add a rule to start monitoring.
              </p>
            ) : (
              rules.map((rule) => (
                <div
                  key={rule.id}
                  className={`p-3 border transition-colors ${
                    rule.enabled ? 'border-neo-border' : 'border-neo-border/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-neo-text-primary">{rule.name}</span>
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-mono uppercase border ${severityColor(
                            rule.severity,
                          )}`}
                        >
                          {severityBadge(rule.severity)} {rule.severity}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-neo-text-secondary mb-1">
                        Condition: {rule.condition}
                      </div>
                      {rule.description && (
                        <div className="text-[10px] font-mono text-neo-text-secondary/70">
                          {rule.description}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleRule(rule.id, rule.enabled)}
                      disabled={loading}
                      className={`ml-4 px-3 py-1.5 text-xs font-mono border transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed ${
                        rule.enabled
                          ? 'border-neo-green text-neo-green hover:bg-neo-green/10'
                          : 'border-neo-red/50 text-neo-red/50 hover:bg-neo-red/10'
                      }`}
                    >
                      {rule.enabled ? '◆ Enabled' : '◇ Disabled'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Events Tab */}
      {activeTab === 'events' && (
        <Card title="Active Alert Events" glowColor="yellow">
          <div className="space-y-2">
            {events.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">No active alert events</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className={`p-3 border ${severityColor(event.severity).replace('bg-', 'border-').split(' ')[1]}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-mono text-neo-text-primary">{event.ruleName}</span>
                    <span
                      className={`inline-block px-2 py-0.5 text-[9px] font-mono uppercase border ${severityColor(
                        event.severity,
                      )}`}
                    >
                      {severityBadge(event.severity)} {event.severity}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-neo-text-secondary mb-1">
                    {event.message}
                  </div>
                  <div className="text-[10px] font-mono text-neo-text-secondary/50">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <Card title="Alert History (Last 100)" glowColor="green">
          <div className="space-y-1">
            {history.length === 0 ? (
              <p className="text-xs font-mono text-neo-text-secondary">No alert history</p>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-2 border border-neo-border/50 hover:border-neo-border transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-neo-text-primary">
                          {item.ruleName}
                        </span>
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[8px] font-mono uppercase border ${severityColor(
                            item.severity,
                          )}`}
                        >
                          {item.severity}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-neo-text-secondary mb-0.5">
                        {item.message}
                      </div>
                      <div className="text-[9px] font-mono text-neo-text-secondary/50">
                        {new Date(item.timestamp).toLocaleString()}
                        {item.resolvedAt && (
                          <span className="ml-2 text-neo-green">
                            → Resolved {new Date(item.resolvedAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* Add Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-bg-deep/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-neo-bg-surface border-2 border-neo-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            <h2 className="font-display text-lg uppercase tracking-[0.15em] text-neo-cyan mb-4">
              ◈ Add Alert Rule
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={newRule.name}
                  onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                  placeholder="e.g., High CPU Usage"
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Condition
                </label>
                <input
                  type="text"
                  value={newRule.condition}
                  onChange={(e) => setNewRule({ ...newRule, condition: e.target.value })}
                  placeholder="e.g., cpu > 90"
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Severity
                </label>
                <select
                  value={newRule.severity}
                  onChange={(e) =>
                    setNewRule({ ...newRule, severity: e.target.value as AlertRule['severity'] })
                  }
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan"
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newRule.description}
                  onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                  placeholder="Describe when this alert should trigger..."
                  rows={3}
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan resize-none"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewRule({ name: '', condition: '', severity: 'warning', description: '' });
                    setError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-mono border border-neo-border text-neo-text-secondary hover:bg-neo-border/10 transition-colors uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRule}
                  disabled={loading || !newRule.name.trim() || !newRule.condition.trim()}
                  className="px-3 py-1.5 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⟳ Adding...' : '✓ Add Rule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
