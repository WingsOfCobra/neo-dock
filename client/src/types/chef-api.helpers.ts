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

/** Safe array element extractor — avoids `never[number]` = `unknown` issues */
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/* ── System ──────────────────────────────────────────────────── */

export type ChefSystemHealth = GetJson<'/system/health'>;
export type ChefDiskInfo = ArrayElement<GetJson<'/system/disk'>>;
export type ChefProcessInfo = ArrayElement<GetJson<'/system/processes'>>;

/* ── Docker ──────────────────────────────────────────────────── */

export type ChefContainer = ArrayElement<GetJson<'/docker/containers'>>;
export type ChefContainerStats = GetJson<'/docker/containers/{id}/stats'>;
export type ChefContainerLogs = GetJson<'/docker/containers/{id}/logs'>;
export type ChefDockerOverview = GetJson<'/docker/stats'>;

/* ── GitHub ──────────────────────────────────────────────────── */

export type ChefGitHubRepo = ArrayElement<GetJson<'/github/repos'>>;
export type ChefGitHubPR = ArrayElement<GetJson<'/github/repos/{owner}/{repo}/prs'>>;
export type ChefGitHubIssue = ArrayElement<GetJson<'/github/repos/{owner}/{repo}/issues'>>;
export type ChefGitHubWorkflow = ArrayElement<GetJson<'/github/repos/{owner}/{repo}/workflows'>>;
export type ChefGitHubNotification = ArrayElement<GetJson<'/github/notifications'>>;

/* ── Email ───────────────────────────────────────────────────── */

export type ChefEmailUnread = GetJson<'/email/unread'>;
export type ChefEmailMessage = ArrayElement<NonNullable<ChefEmailUnread['messages']>>;
export type ChefEmailSearch = ArrayElement<GetJson<'/email/search'>>;
export type ChefEmailThread = GetJson<'/email/thread/{uid}'>;

/* ── Todos ───────────────────────────────────────────────────── */

export type ChefTodoList = GetJson<'/todo/'>;
export type ChefTodoDb = ArrayElement<NonNullable<ChefTodoList['db']>>;
export type ChefTodoFile = ArrayElement<NonNullable<ChefTodoList['file']>>;
export type ChefTodoCreated = PostJson<'/todo/'>;
export type ChefTodoUpdated = PatchJson<'/todo/{id}'>;

/* ── Cron ────────────────────────────────────────────────────── */

export type ChefCronJob = ArrayElement<GetJson<'/cron/jobs'>>;
export type ChefCronJobCreated = PostJson<'/cron/jobs'>;
export type ChefCronRunResult = PostJson<'/cron/jobs/{id}/run'>;
export type ChefCronHistory = ArrayElement<GetJson<'/cron/jobs/{id}/history'>>;
export type ChefCronPresets = GetJson<'/cron/presets'>;
export type ChefCronHealth = GetJson<'/cron/health'>;

/* ── Services ────────────────────────────────────────────────── */

export type ChefServicesResponse = GetJson<'/services/status'>;
export type ChefService = ArrayElement<NonNullable<ChefServicesResponse['services']>>;

/* ── SSH ─────────────────────────────────────────────────────── */

export type ChefSSHHost = ArrayElement<GetJson<'/ssh/hosts'>>;
export type ChefSSHRunResult = PostJson<'/ssh/run'>;

/* ── Hooks ───────────────────────────────────────────────────── */

export type ChefWebhookEvent = PostJson<'/hooks/agent-event'>;
export type ChefEventsResponse = GetJson<'/hooks/events'>;

/* ── Logs (chef-api, not Loki) ───────────────────────────────── */

export type ChefLogSource = ArrayElement<GetJson<'/logs/files'>>;
export type ChefLogTail = GetJson<'/logs/tail/{source}'>;
export type ChefLogSearchResult = GetJson<'/logs/search'>;
export type ChefLogStats = ArrayElement<GetJson<'/logs/stats'>>;

/* ── Notifications ───────────────────────────────────────────── */

export type ChefNotifyResult = PostJson<'/hooks/notify'>;
