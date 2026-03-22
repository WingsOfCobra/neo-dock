/**
 * Type-level tests for chef-api helper types.
 * These use type assertions to verify the helper types resolve correctly
 * at compile time. If the types are wrong, TypeScript will error.
 */
import { describe, it, expect } from 'vitest';
import type {
  ChefSystemHealth,
  ChefDiskInfo,
  ChefProcessInfo,
  ChefContainer,
  ChefContainerStats,
  ChefDockerOverview,
  ChefGitHubRepo,
  ChefGitHubNotification,
  ChefGitHubPR,
  ChefGitHubIssue,
  ChefEmailUnread,
  ChefEmailMessage,
  ChefTodoList,
  ChefTodoDb,
  ChefTodoFile,
  ChefCronJob,
  ChefCronHealth,
  ChefService,
  ChefServicesResponse,
} from './chef-api.helpers';

// Helper: asserts a type is not `never`
type AssertNotNever<T> = [T] extends [never] ? false : true;

// Helper: asserts a type is an object (not primitive)
type IsObject<T> = T extends Record<string, unknown> ? true : false;

describe('chef-api helper types', () => {
  it('ChefSystemHealth resolves to a non-never object type', () => {
    const check: AssertNotNever<ChefSystemHealth> = true;
    expect(check).toBe(true);
  });

  it('ChefDiskInfo resolves to a non-never type (array element)', () => {
    const check: AssertNotNever<ChefDiskInfo> = true;
    expect(check).toBe(true);
  });

  it('ChefProcessInfo resolves to a non-never type (array element)', () => {
    const check: AssertNotNever<ChefProcessInfo> = true;
    expect(check).toBe(true);
  });

  it('ChefContainer resolves to a non-never type', () => {
    const check: AssertNotNever<ChefContainer> = true;
    expect(check).toBe(true);
  });

  it('ChefContainerStats resolves to a non-never type', () => {
    const check: AssertNotNever<ChefContainerStats> = true;
    expect(check).toBe(true);
  });

  it('ChefDockerOverview resolves to a non-never type', () => {
    const check: AssertNotNever<ChefDockerOverview> = true;
    expect(check).toBe(true);
  });

  it('ChefGitHubRepo resolves to a non-never type', () => {
    const check: AssertNotNever<ChefGitHubRepo> = true;
    expect(check).toBe(true);
    // Verify it has expected properties
    const repo = {} as ChefGitHubRepo;
    const _name: typeof repo.name = undefined; // name should be string | undefined
    expect(true).toBe(true);
  });

  it('ChefGitHubNotification resolves to a non-never type', () => {
    const check: AssertNotNever<ChefGitHubNotification> = true;
    expect(check).toBe(true);
  });

  it('ChefGitHubPR resolves to a non-never type', () => {
    const check: AssertNotNever<ChefGitHubPR> = true;
    expect(check).toBe(true);
  });

  it('ChefGitHubIssue resolves to a non-never type', () => {
    const check: AssertNotNever<ChefGitHubIssue> = true;
    expect(check).toBe(true);
  });

  it('ChefEmailUnread resolves to an object with messages', () => {
    const check: AssertNotNever<ChefEmailUnread> = true;
    const isObj: IsObject<ChefEmailUnread> = true;
    expect(check).toBe(true);
    expect(isObj).toBe(true);
  });

  it('ChefEmailMessage resolves to a non-never type', () => {
    const check: AssertNotNever<ChefEmailMessage> = true;
    expect(check).toBe(true);
  });

  it('ChefTodoList resolves to an object with db and file arrays', () => {
    const check: AssertNotNever<ChefTodoList> = true;
    const isObj: IsObject<ChefTodoList> = true;
    expect(check).toBe(true);
    expect(isObj).toBe(true);
    // Verify shape: db and file should exist
    const list = {} as ChefTodoList;
    const _db: typeof list.db = undefined;
    const _file: typeof list.file = undefined;
    expect(true).toBe(true);
  });

  it('ChefTodoDb resolves to a non-never type', () => {
    const check: AssertNotNever<ChefTodoDb> = true;
    expect(check).toBe(true);
  });

  it('ChefTodoFile resolves to a non-never type', () => {
    const check: AssertNotNever<ChefTodoFile> = true;
    expect(check).toBe(true);
  });

  it('ChefCronJob resolves to a non-never type', () => {
    const check: AssertNotNever<ChefCronJob> = true;
    expect(check).toBe(true);
  });

  it('ChefCronHealth resolves to a non-never type', () => {
    const check: AssertNotNever<ChefCronHealth> = true;
    expect(check).toBe(true);
  });

  it('ChefServicesResponse resolves to an object type', () => {
    const check: AssertNotNever<ChefServicesResponse> = true;
    const isObj: IsObject<ChefServicesResponse> = true;
    expect(check).toBe(true);
    expect(isObj).toBe(true);
  });

  it('ChefService resolves to a non-never type', () => {
    const check: AssertNotNever<ChefService> = true;
    expect(check).toBe(true);
  });
});
