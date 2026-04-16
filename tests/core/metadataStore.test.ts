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
  createProject,
  listProjects,
  getProject,
  addSessionsToProject,
  removeSessionsFromProject,
  deleteProject,
  getProjectSessionIds,
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

describe('projects', () => {
  beforeEach(() => {
    const testDir = join(tmpdir(), 'claude-sessions-proj-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
    process.env.CLAUDE_SESSIONS_DATA_DIR = testDir;
  });

  afterEach(() => {
    const dir = process.env.CLAUDE_SESSIONS_DATA_DIR!;
    rmSync(dir, { recursive: true, force: true });
    delete process.env.CLAUDE_SESSIONS_DATA_DIR;
  });

  it('creates a project', () => {
    const project = createProject('Pen Testing', 'Security sprint');
    expect(project.sessions).toEqual([]);
    expect(project.description).toBe('Security sprint');
    expect(project.created).toBeDefined();
  });

  it('throws on duplicate project name', () => {
    createProject('My Project');
    expect(() => createProject('My Project')).toThrow('already exists');
  });

  it('lists all projects', () => {
    createProject('Project A');
    createProject('Project B', 'description B');
    const projects = listProjects();
    expect(Object.keys(projects)).toEqual(['Project A', 'Project B']);
    expect(projects['Project B'].description).toBe('description B');
  });

  it('gets a specific project', () => {
    createProject('Auth Refactor');
    const project = getProject('Auth Refactor');
    expect(project).not.toBeNull();
    expect(project!.sessions).toEqual([]);
  });

  it('returns null for non-existent project', () => {
    expect(getProject('nope')).toBeNull();
  });

  it('adds sessions to a project', () => {
    createProject('Sprint 4');
    addSessionsToProject('Sprint 4', ['session-1', 'session-2']);
    const ids = getProjectSessionIds('Sprint 4');
    expect(ids).toEqual(['session-1', 'session-2']);
  });

  it('does not duplicate session IDs', () => {
    createProject('Sprint 4');
    addSessionsToProject('Sprint 4', ['session-1', 'session-2']);
    addSessionsToProject('Sprint 4', ['session-2', 'session-3']);
    const ids = getProjectSessionIds('Sprint 4');
    expect(ids).toEqual(['session-1', 'session-2', 'session-3']);
  });

  it('removes sessions from a project', () => {
    createProject('Sprint 4');
    addSessionsToProject('Sprint 4', ['s1', 's2', 's3']);
    removeSessionsFromProject('Sprint 4', ['s2']);
    const ids = getProjectSessionIds('Sprint 4');
    expect(ids).toEqual(['s1', 's3']);
  });

  it('deletes a project', () => {
    createProject('Temp');
    deleteProject('Temp');
    expect(getProject('Temp')).toBeNull();
  });

  it('throws when adding to non-existent project', () => {
    expect(() => addSessionsToProject('nope', ['s1'])).toThrow('not found');
  });

  it('throws when deleting non-existent project', () => {
    expect(() => deleteProject('nope')).toThrow('not found');
  });
});
