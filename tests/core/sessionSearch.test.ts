import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchSessions } from '../../src/core/sessionSearch.js';
import type { Session } from '../../src/core/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, '..', 'fixtures');

const makeMockSession = (id: string, jsonlFile: string): Session => ({
  id,
  summary: '',
  firstPrompt: '',
  branch: 'main',
  projectPath: '/home/user/project',
  projectDir: FIXTURES,
  messageCount: 10,
  created: new Date('2026-03-10'),
  modified: new Date('2026-03-10'),
  isSidechain: false,
  jsonlPath: join(FIXTURES, jsonlFile),
  tags: [],
  name: null,
  archived: false,
});

describe('searchSessions', () => {
  const sessions = [
    makeMockSession('abc123', 'session-abc123.jsonl'),
    makeMockSession('def456', 'session-def456.jsonl'),
  ];

  it('finds sessions containing the search query', () => {
    const results = searchSessions(sessions, 'token validation');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].session.id).toBe('abc123');
  });

  it('finds sessions with rate limiting content', () => {
    const results = searchSessions(sessions, 'rate limiting');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.session.id === 'def456')).toBe(true);
  });

  it('returns empty array for no matches', () => {
    const results = searchSessions(sessions, 'xyznonexistent12345');
    expect(results).toEqual([]);
  });

  it('respects limit option', () => {
    const results = searchSessions(sessions, 'the', 1);
    expect(results.length).toBeLessThanOrEqual(1);
  });
});
