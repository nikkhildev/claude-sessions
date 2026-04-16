import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadMetadata,
  addTags,
  removeTags,
  setSessionName,
  getSessionMeta,
} from '../../src/core/metadataStore.js';

const TEST_DIR = join(tmpdir(), 'claude-sessions-test-' + Date.now());

describe('metadataStore', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
    process.env.CLAUDE_SESSIONS_DATA_DIR = TEST_DIR;
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.CLAUDE_SESSIONS_DATA_DIR;
  });

  it('returns empty metadata when no file exists', () => {
    const meta = loadMetadata();
    expect(meta.version).toBe(1);
    expect(meta.sessions).toEqual({});
  });

  it('adds tags to a session', () => {
    addTags('session-1', ['bug', 'sprint-4']);
    const meta = loadMetadata();
    expect(meta.sessions['session-1'].tags).toEqual(['bug', 'sprint-4']);
  });

  it('does not duplicate tags', () => {
    addTags('session-1', ['bug', 'sprint-4']);
    addTags('session-1', ['bug', 'auth']);
    const meta = loadMetadata();
    expect(meta.sessions['session-1'].tags).toEqual([
      'bug',
      'sprint-4',
      'auth',
    ]);
  });

  it('removes tags from a session', () => {
    addTags('session-1', ['bug', 'sprint-4', 'auth']);
    removeTags('session-1', ['sprint-4']);
    const meta = loadMetadata();
    expect(meta.sessions['session-1'].tags).toEqual(['bug', 'auth']);
  });

  it('sets a custom name for a session', () => {
    setSessionName('session-1', 'my-auth-fix');
    const entry = getSessionMeta('session-1');
    expect(entry?.name).toBe('my-auth-fix');
  });

  it('persists across load/save cycles', () => {
    addTags('session-1', ['important']);
    setSessionName('session-1', 'test-name');

    const meta = loadMetadata();
    expect(meta.sessions['session-1'].tags).toEqual(['important']);
    expect(meta.sessions['session-1'].name).toBe('test-name');
  });
});
