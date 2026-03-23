/* ── SecretsPage – Bitwarden secrets vault ─────────────────────── */

import { useEffect, useState } from 'react';
import { get, post, del } from '@/lib/api';
import { Card } from '@/components/ui/Card';

interface Secret {
  name: string;
  lastUpdated?: string;
  createdAt?: string;
}

export function SecretsPage() {
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSecretName, setNewSecretName] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');

  useEffect(() => {
    loadSecrets();
  }, []);

  async function loadSecrets() {
    try {
      setError(null);
      const data = await get<Secret[]>('/chef/secrets/');
      setSecrets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load secrets');
    }
  }

  async function handleAddSecret() {
    if (!newSecretName.trim() || !newSecretValue.trim()) {
      setError('Secret name and value are required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await post(`/chef/secrets/${encodeURIComponent(newSecretName)}`, {
        value: newSecretValue,
      });
      setNewSecretName('');
      setNewSecretValue('');
      setShowAddModal(false);
      await loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add secret');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSecret(name: string) {
    if (!confirm(`Delete secret "${name}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await del(`/chef/secrets/${encodeURIComponent(name)}`);
      await loadSecrets();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete secret');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-[0.2em] text-neo-cyan">
          ◈ Secrets Vault
        </h1>
        <div className="flex gap-2">
          <button
            onClick={loadSecrets}
            className="px-3 py-1.5 text-xs font-mono border border-neo-cyan text-neo-cyan hover:bg-neo-cyan/10 transition-colors uppercase"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase"
          >
            ◈ Add Secret
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 border border-neo-red/50 bg-neo-red/5">
          <p className="text-xs font-mono text-neo-red">⚠ {error}</p>
        </div>
      )}

      {/* Warning Banner */}
      <div className="p-3 border border-neo-yellow/50 bg-neo-yellow/5">
        <p className="text-xs font-mono text-neo-yellow">
          ⚠ Security Notice: Secret values are never displayed. Names and metadata only.
        </p>
      </div>

      {/* Secrets List */}
      <Card title="Stored Secrets" glowColor="red">
        <div className="space-y-2">
          {secrets.length === 0 ? (
            <p className="text-xs font-mono text-neo-text-secondary">
              No secrets stored. Configure Bitwarden CLI or add secrets manually.
            </p>
          ) : (
            secrets.map((secret) => (
              <div
                key={secret.name}
                className="flex items-center justify-between p-3 border border-neo-border hover:border-neo-cyan/30 transition-colors"
              >
                <div>
                  <div className="text-xs font-mono text-neo-text-primary mb-1">
                    ◆ {secret.name}
                  </div>
                  <div className="text-[10px] font-mono text-neo-text-secondary">
                    Value: ••••••••
                  </div>
                  {secret.lastUpdated && (
                    <div className="text-[10px] font-mono text-neo-text-secondary/50 mt-1">
                      Last updated: {new Date(secret.lastUpdated).toLocaleString()}
                    </div>
                  )}
                  {secret.createdAt && (
                    <div className="text-[10px] font-mono text-neo-text-secondary/50">
                      Created: {new Date(secret.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteSecret(secret.name)}
                  disabled={loading}
                  className="px-3 py-1.5 text-xs font-mono border border-neo-red/50 text-neo-red/50 hover:bg-neo-red/10 hover:border-neo-red hover:text-neo-red transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✕ Delete
                </button>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Secret Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neo-bg-deep/80 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 bg-neo-bg-surface border-2 border-neo-cyan shadow-[0_0_30px_rgba(0,255,255,0.3)]">
            <h2 className="font-display text-lg uppercase tracking-[0.15em] text-neo-cyan mb-4">
              ◈ Add Secret
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Secret Name
                </label>
                <input
                  type="text"
                  value={newSecretName}
                  onChange={(e) => setNewSecretName(e.target.value)}
                  placeholder="e.g., DB_PASSWORD, API_KEY"
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-neo-text-secondary uppercase mb-1">
                  Secret Value
                </label>
                <textarea
                  value={newSecretValue}
                  onChange={(e) => setNewSecretValue(e.target.value)}
                  placeholder="Enter the secret value..."
                  rows={4}
                  className="w-full px-3 py-2 bg-neo-bg-elevated border border-neo-border text-neo-text-primary font-mono text-xs focus:outline-none focus:border-neo-cyan resize-none"
                />
              </div>

              <div className="p-2 border border-neo-yellow/30 bg-neo-yellow/5">
                <p className="text-[9px] font-mono text-neo-yellow">
                  ⚠ Secret values are stored securely and cannot be retrieved via UI. Use chef-api
                  inject endpoints or CLI for programmatic access.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setNewSecretName('');
                    setNewSecretValue('');
                    setError(null);
                  }}
                  className="px-3 py-1.5 text-xs font-mono border border-neo-border text-neo-text-secondary hover:bg-neo-border/10 transition-colors uppercase"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSecret}
                  disabled={loading || !newSecretName.trim() || !newSecretValue.trim()}
                  className="px-3 py-1.5 text-xs font-mono border border-neo-green text-neo-green hover:bg-neo-green/10 transition-colors uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⟳ Adding...' : '✓ Add Secret'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
