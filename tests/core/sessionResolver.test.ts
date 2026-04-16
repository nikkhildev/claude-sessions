import { describe, it, expect } from 'vitest';
import { resolveSession } from '../../src/core/sessionResolver.js';
import type { Session } from '../../src/core/types.js';

const makeMockSession = (overrides: Partial<Session>): Session => ({
  id: 'abc12345-1111-2222-3333-444444444444',
  summary: 'Test Session',
  firstPrompt: 'test prompt',
  branch: 'main',
  projectPath: '/home/user/project',
  projectDir: '/tmp/projects',
  messageCount: 10,
  created: new Date('2026-03-10'),
  modified: new Date('2026-03-10'),
  isSidechain: false,
  jsonlPath: '/tmp/test.jsonl',
  tags: [],
  name: null,
  archived: false,
  ...overrides,
});

const sessions: Session[] = [
  makeMockSession({
    id: 'abc12345-1111-2222-3333-444444444444',
    name: 'auth-fix',
  }),
  makeMockSession({
    id: 'def45678-5555-6666-7777-888888888888',
    name: null,
  }),
  makeMockSession({
    id: 'ghi78901-9999-0000-1111-222222222222',
    name: 'db-refactor',
  }),
];

describe('resolveSession', () => {
  it('resolves full UUID', () => {
    const result = resolveSession(
      'abc12345-1111-2222-3333-444444444444',
      sessions,
    );
    expect(result?.id).toBe('abc12345-1111-2222-3333-444444444444');
  });

  it('resolves partial UUID prefix', () => {
    const result = resolveSession('abc12', sessions);
    expect(result?.id).toBe('abc12345-1111-2222-3333-444444444444');
  });

  it('resolves by custom name', () => {
    const result = resolveSession('auth-fix', sessions);
    expect(result?.id).toBe('abc12345-1111-2222-3333-444444444444');
  });

  it('resolves by index number (1-based)', () => {
    const result = resolveSession('#2', sessions);
    expect(result?.id).toBe('def45678-5555-6666-7777-888888888888');
  });

  it('returns null for ambiguous partial ID', () => {
    const dupes = [
      makeMockSession({ id: 'aaa11111-0000-0000-0000-000000000000' }),
      makeMockSession({ id: 'aaa22222-0000-0000-0000-000000000000' }),
    ];
    const result = resolveSession('aaa', dupes);
    expect(result).toBeNull();
  });

  it('returns null for no match', () => {
    const result = resolveSession('zzz99999', sessions);
    expect(result).toBeNull();
  });

  it('returns null for out-of-range index', () => {
    const result = resolveSession('#99', sessions);
    expect(result).toBeNull();
  });
});
