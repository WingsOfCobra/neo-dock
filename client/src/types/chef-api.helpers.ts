/**
 * Convenience type helpers for extracting response types from the
 * auto-generated chef-api.types.ts (openapi-typescript output).
 *
 * Usage: ChefResponse<"/system/health"> → the 200 JSON body type
 */
import type { paths } from './chef-api.types';

/* ── Generic response extractor ──────────────────────────────── */

/** Extract the JSON body of a successful GET response */
type GetJson<P extends keyof paths> =
  paths[P] extends { get: { responses: { 200: { content: { 'application/json': infer R } } } } }
    ? R
    : never;

/** Extract the JSON body of a successful POST response (201 or 200) */
type PostJson<P extends keyof paths> =
  paths[P] extends { post: { responses: { 201: { content: { 'application/json': infer R } } } } }
    ? R
    : paths[P] extends { post: { responses: { 200: { content: { 'application/json': infer R } } } } }
      ? R
      : never;

/** Extract the JSON body of a successful PATCH response */
type PatchJson<P extends keyof paths> =
  paths[P] extends { patch: { responses: { 200: { content: { 'application/json': infer R } } } } }
    ? R
    : never;

/* ── System ──────────────────────────────────────────────────── */

export type ChefSystemHealth = GetJson<'/system/health'>;
export type ChefDiskInfo = GetJson<'/system/disk'>[number];
export type ChefProcessInfo = GetJson<'/system/processes'>[number];

/* ── Docker ──────────────────────────────────────────────────── */

export type ChefContainer = GetJson<'/docker/containers'>[number];
export type ChefContainerStats = GetJson<'/docker/containers/{id}/stats'>;
export type ChefContainerLogs = GetJson<'/docker/containers/{id}/logs'>;
export type ChefDockerOverview = GetJson<'/docker/stats'>;

/* ── GitHub ──────────────────────────────────────────────────── */

export type ChefGitHubRepo = GetJson<'/github/repos'>[number];
export type ChefGitHubPR = GetJson<'/github/repos/{owner}/{repo}/prs'>[number];
export type ChefGitHubIssue = GetJson<'/github/repos/{owner}/{repo}/issues'>[number];
export type ChefGitHubWorkflow = GetJson<'/github/repos/{owner}/{repo}/workflows'>[number];
export type ChefGitHubNotification = GetJson<'/github/notifications'>[number];

/* ── Email ───────────────────────────────────────────────────── */

export type ChefEmailUnread = GetJson<'/email/unread'>;
export type ChefEmailMessage = NonNullable<ChefEmailUnread['messages']>[number];
export type ChefEmailSearch = GetJson<'/email/search'>[number];
export type ChefEmailThread = GetJson<'/email/thread/{uid}'>;

/* ── Todos ───────────────────────────────────────────────────── */

export type ChefTodoList = GetJson<'/todo/'>;
export type ChefTodoDb = NonNullable<ChefTodoList['db']>[number];
export type ChefTodoFile = NonNullable<ChefTodoList['file']>[number];
export type ChefTodoCreated = PostJson<'/todo/'>;
export type ChefTodoUpdated = PatchJson<'/todo/{id}'>;

/* ── Cron ────────────────────────────────────────────────────── */

export type ChefCronJob = GetJson<'/cron/jobs'>[number];
export type ChefCronJobCreated = PostJson<'/cron/jobs'>;
export type ChefCronRunResult = PostJson<'/cron/jobs/{id}/run'>;
export type ChefCronHistory = GetJson<'/cron/jobs/{id}/history'>[number];
export type ChefCronPresets = GetJson<'/cron/presets'>;
export type ChefCronHealth = GetJson<'/cron/health'>;

/* ── Services ────────────────────────────────────────────────── */

export type ChefServicesResponse = GetJson<'/services/status'>;
export type ChefService = NonNullable<ChefServicesResponse['services']>[number];

/* ── SSH ─────────────────────────────────────────────────────── */

export type ChefSSHHost = GetJson<'/ssh/hosts'>[number];
export type ChefSSHRunResult = PostJson<'/ssh/run'>;

/* ── Hooks ───────────────────────────────────────────────────── */

export type ChefWebhookEvent = PostJson<'/hooks/agent-event'>;
export type ChefEventsResponse = GetJson<'/hooks/events'>;

/* ── Logs (chef-api, not Loki) ───────────────────────────────── */

export type ChefLogSource = GetJson<'/logs/files'>[number];
export type ChefLogTail = GetJson<'/logs/tail/{source}'>;
export type ChefLogSearchResult = GetJson<'/logs/search'>;
export type ChefLogStats = GetJson<'/logs/stats'>[number];

/* ── Notifications ───────────────────────────────────────────── */

export type ChefNotifyResult = PostJson<'/hooks/notify'>;
