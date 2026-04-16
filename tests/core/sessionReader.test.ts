import { describe, it, expect } from 'vitest';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadSessionsFromIndex,
  parseSessionFromJsonl,
  readSessionMessages,
} from '../../src/core/sessionReader.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, '..', 'fixtures');

describe('loadSessionsFromIndex', () => {
  it('loads sessions from a valid sessions-index.json', () => {
    const indexPath = join(FIXTURES, 'sessions-index.json');
    const sessions = loadSessionsFromIndex(indexPath, FIXTURES);
    expect(sessions).toHaveLength(3);
    expect(sessions[0].id).toBe('abc12345-1111-2222-3333-444444444444');
    expect(sessions[0].summary).toBe('Fix Login Authentication Bug');
    expect(sessions[0].branch).toBe('fix/login-auth-bug');
    expect(sessions[0].messageCount).toBe(24);
  });

  it('returns empty array for non-existent file', () => {
    const sessions = loadSessionsFromIndex('/nonexistent/path.json', '/tmp');
    expect(sessions).toEqual([]);
  });
});

describe('parseSessionFromJsonl', () => {
  it('extracts metadata from JSONL first lines', () => {
    const jsonlPath = join(FIXTURES, 'session-abc123.jsonl');
    const session = parseSessionFromJsonl(jsonlPath);
    expect(session).not.toBeNull();
    expect(session!.id).toBe('abc12345-1111-2222-3333-444444444444');
    expect(session!.branch).toBe('fix/login-auth-bug');
    expect(session!.firstPrompt).toBe('fix the login bug in auth module');
    expect(session!.messageCount).toBe(4);
  });

  it('returns null for non-existent file', () => {
    const session = parseSessionFromJsonl('/nonexistent/file.jsonl');
    expect(session).toBeNull();
  });
});

describe('readSessionMessages', () => {
  it('extracts user and assistant messages from JSONL', () => {
    const jsonlPath = join(FIXTURES, 'session-abc123.jsonl');
    const messages = readSessionMessages(jsonlPath);
    expect(messages).toHaveLength(4);
    expect(messages[0].type).toBe('user');
    expect(messages[0].content).toContain('fix the login bug');
    expect(messages[1].type).toBe('assistant');
  });

  it('limits messages when maxMessages is set', () => {
    const jsonlPath = join(FIXTURES, 'session-abc123.jsonl');
    const messages = readSessionMessages(jsonlPath, 2);
    expect(messages).toHaveLength(2);
  });

  it('returns empty array for non-existent file', () => {
    const messages = readSessionMessages('/nonexistent/path.jsonl');
    expect(messages).toEqual([]);
  });
});
