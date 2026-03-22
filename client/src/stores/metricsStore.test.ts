import { describe, it, expect, beforeEach } from 'vitest';
import { useMetricsStore } from './metricsStore';
import type { MetricsPoint, LokiLogEntry } from '@/types';

function makeMetricsPoint(ts: number): MetricsPoint {
  return { timestamp: ts, cpu: 50, memUsedPercent: 60, loadAvg: [1, 2, 3] };
}

function makeLokiEntry(ts: string, line: string): LokiLogEntry {
  return { timestamp: ts, line, labels: { job: 'test' } };
}

describe('metricsStore', () => {
  beforeEach(() => {
    // Reset the store to initial state before each test
    useMetricsStore.setState({
      systemHealth: null,
      systemDisk: [],
      systemProcesses: [],
      systemMetrics: [],
      containers: [],
      containerStats: {},
      dockerOverview: null,
      services: [],
      githubRepos: [],
      githubNotifications: [],
      githubPRs: [],
      githubIssues: [],
      githubWorkflows: [],
      emailCount: 0,
      emails: [],
      cronJobs: [],
      cronHealth: null,
      todos: [],
      todoTotal: 0,
      lokiLogs: [],
      lokiLabels: [],
    });
  });

  describe('initial state', () => {
    it('has null systemHealth', () => {
      expect(useMetricsStore.getState().systemHealth).toBeNull();
    });

    it('has empty arrays for list fields', () => {
      const state = useMetricsStore.getState();
      expect(state.systemDisk).toEqual([]);
      expect(state.systemProcesses).toEqual([]);
      expect(state.systemMetrics).toEqual([]);
      expect(state.containers).toEqual([]);
      expect(state.services).toEqual([]);
      expect(state.githubRepos).toEqual([]);
      expect(state.githubNotifications).toEqual([]);
      expect(state.githubPRs).toEqual([]);
      expect(state.githubIssues).toEqual([]);
      expect(state.githubWorkflows).toEqual([]);
      expect(state.emails).toEqual([]);
      expect(state.cronJobs).toEqual([]);
      expect(state.todos).toEqual([]);
      expect(state.lokiLogs).toEqual([]);
      expect(state.lokiLabels).toEqual([]);
    });

    it('has zero counts', () => {
      const state = useMetricsStore.getState();
      expect(state.emailCount).toBe(0);
      expect(state.todoTotal).toBe(0);
    });

    it('has empty containerStats object', () => {
      expect(useMetricsStore.getState().containerStats).toEqual({});
    });

    it('has null dockerOverview and cronHealth', () => {
      const state = useMetricsStore.getState();
      expect(state.dockerOverview).toBeNull();
      expect(state.cronHealth).toBeNull();
    });
  });

  describe('setters', () => {
    it('setSystemHealth updates systemHealth', () => {
      const health = { cpu: { usage_percent: 42 } } as never;
      useMetricsStore.getState().setSystemHealth(health);
      expect(useMetricsStore.getState().systemHealth).toBe(health);
    });

    it('setSystemDisk updates systemDisk', () => {
      const disks = [{ device: '/dev/sda1' }] as never;
      useMetricsStore.getState().setSystemDisk(disks);
      expect(useMetricsStore.getState().systemDisk).toBe(disks);
    });

    it('setSystemProcesses updates systemProcesses', () => {
      const procs = [{ pid: 1, name: 'init' }] as never;
      useMetricsStore.getState().setSystemProcesses(procs);
      expect(useMetricsStore.getState().systemProcesses).toBe(procs);
    });

    it('setContainers updates containers', () => {
      const containers = [{ id: 'abc', name: 'test' }] as never;
      useMetricsStore.getState().setContainers(containers);
      expect(useMetricsStore.getState().containers).toBe(containers);
    });

    it('setContainerStats adds stats keyed by id', () => {
      const stats = { cpu_percent: 10 } as never;
      useMetricsStore.getState().setContainerStats('c1', stats);
      expect(useMetricsStore.getState().containerStats['c1']).toBe(stats);

      // Add another, first should still be there
      const stats2 = { cpu_percent: 20 } as never;
      useMetricsStore.getState().setContainerStats('c2', stats2);
      expect(useMetricsStore.getState().containerStats['c1']).toBe(stats);
      expect(useMetricsStore.getState().containerStats['c2']).toBe(stats2);
    });

    it('setDockerOverview updates dockerOverview', () => {
      const overview = { total: 5 } as never;
      useMetricsStore.getState().setDockerOverview(overview);
      expect(useMetricsStore.getState().dockerOverview).toBe(overview);
    });

    it('setServices updates services', () => {
      const services = [{ name: 'nginx', active: true }] as never;
      useMetricsStore.getState().setServices(services);
      expect(useMetricsStore.getState().services).toBe(services);
    });

    it('setGithubRepos updates githubRepos', () => {
      const repos = [{ name: 'neo-dock' }] as never;
      useMetricsStore.getState().setGithubRepos(repos);
      expect(useMetricsStore.getState().githubRepos).toBe(repos);
    });

    it('setGithubNotifications updates githubNotifications', () => {
      const notifs = [{ id: '1' }] as never;
      useMetricsStore.getState().setGithubNotifications(notifs);
      expect(useMetricsStore.getState().githubNotifications).toBe(notifs);
    });

    it('setGithubPRs updates githubPRs', () => {
      const prs = [{ number: 1 }] as never;
      useMetricsStore.getState().setGithubPRs(prs);
      expect(useMetricsStore.getState().githubPRs).toBe(prs);
    });

    it('setGithubIssues updates githubIssues', () => {
      const issues = [{ number: 1 }] as never;
      useMetricsStore.getState().setGithubIssues(issues);
      expect(useMetricsStore.getState().githubIssues).toBe(issues);
    });

    it('setGithubWorkflows updates githubWorkflows', () => {
      const wf = [{ id: 1 }] as never;
      useMetricsStore.getState().setGithubWorkflows(wf);
      expect(useMetricsStore.getState().githubWorkflows).toBe(wf);
    });

    it('setEmailCount updates emailCount', () => {
      useMetricsStore.getState().setEmailCount(42);
      expect(useMetricsStore.getState().emailCount).toBe(42);
    });

    it('setEmails updates emails', () => {
      const emails = [{ uid: 1 }] as never;
      useMetricsStore.getState().setEmails(emails);
      expect(useMetricsStore.getState().emails).toBe(emails);
    });

    it('setCronJobs updates cronJobs', () => {
      const jobs = [{ id: 1 }] as never;
      useMetricsStore.getState().setCronJobs(jobs);
      expect(useMetricsStore.getState().cronJobs).toBe(jobs);
    });

    it('setCronHealth updates cronHealth', () => {
      const health = { total: 5, healthy: 5 } as never;
      useMetricsStore.getState().setCronHealth(health);
      expect(useMetricsStore.getState().cronHealth).toBe(health);
    });

    it('setTodos updates todos', () => {
      const todos = [{ id: 1, title: 'test', completed: false, source: 'db' as const }];
      useMetricsStore.getState().setTodos(todos);
      expect(useMetricsStore.getState().todos).toBe(todos);
    });

    it('setTodoTotal updates todoTotal', () => {
      useMetricsStore.getState().setTodoTotal(10);
      expect(useMetricsStore.getState().todoTotal).toBe(10);
    });

    it('setLokiLabels updates lokiLabels', () => {
      useMetricsStore.getState().setLokiLabels(['job', 'container_name']);
      expect(useMetricsStore.getState().lokiLabels).toEqual(['job', 'container_name']);
    });

    it('setSystemMetrics replaces systemMetrics', () => {
      const metrics = [makeMetricsPoint(1), makeMetricsPoint(2)];
      useMetricsStore.getState().setSystemMetrics(metrics);
      expect(useMetricsStore.getState().systemMetrics).toBe(metrics);
    });
  });

  describe('pushMetricsPoint', () => {
    it('appends a metrics point', () => {
      const point = makeMetricsPoint(Date.now());
      useMetricsStore.getState().pushMetricsPoint(point);
      expect(useMetricsStore.getState().systemMetrics).toHaveLength(1);
      expect(useMetricsStore.getState().systemMetrics[0]).toBe(point);
    });

    it('caps at MAX_METRICS (3600)', () => {
      // Fill beyond the max
      const points: MetricsPoint[] = [];
      for (let i = 0; i < 3601; i++) {
        points.push(makeMetricsPoint(i));
      }
      // Set initial state to 3599 points
      useMetricsStore.setState({ systemMetrics: points.slice(0, 3599) });
      // Push two more to go over the limit
      useMetricsStore.getState().pushMetricsPoint(points[3599]);
      expect(useMetricsStore.getState().systemMetrics).toHaveLength(3600);
      useMetricsStore.getState().pushMetricsPoint(points[3600]);
      expect(useMetricsStore.getState().systemMetrics).toHaveLength(3600);
      // The oldest point should have been dropped
      expect(useMetricsStore.getState().systemMetrics[0].timestamp).toBe(1);
    });
  });

  describe('appendLokiLogs', () => {
    it('appends log entries', () => {
      const entries = [makeLokiEntry('1000', 'line 1'), makeLokiEntry('1001', 'line 2')];
      useMetricsStore.getState().appendLokiLogs(entries);
      expect(useMetricsStore.getState().lokiLogs).toHaveLength(2);
    });

    it('caps at 2000 entries', () => {
      const initial: LokiLogEntry[] = [];
      for (let i = 0; i < 1999; i++) {
        initial.push(makeLokiEntry(String(i), `line ${i}`));
      }
      useMetricsStore.setState({ lokiLogs: initial });

      // Append 5 more (total would be 2004, should cap at 2000)
      const extra = Array.from({ length: 5 }, (_, i) =>
        makeLokiEntry(String(2000 + i), `extra ${i}`),
      );
      useMetricsStore.getState().appendLokiLogs(extra);
      expect(useMetricsStore.getState().lokiLogs).toHaveLength(2000);
      // The newest entries should be present at the end
      const logs = useMetricsStore.getState().lokiLogs;
      expect(logs[logs.length - 1].line).toBe('extra 4');
    });
  });

  describe('clearLokiLogs', () => {
    it('empties lokiLogs', () => {
      useMetricsStore.setState({
        lokiLogs: [makeLokiEntry('1', 'test')],
      });
      expect(useMetricsStore.getState().lokiLogs).toHaveLength(1);
      useMetricsStore.getState().clearLokiLogs();
      expect(useMetricsStore.getState().lokiLogs).toEqual([]);
    });
  });
});
