import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SessionMetadataFile, SessionMetadataEntry } from './types.js';

function getDataDir(): string {
  return process.env.CLAUDE_SESSIONS_DATA_DIR || join(homedir(), '.claude-sessions');
}

function getMetadataPath(): string {
  return join(getDataDir(), 'metadata.json');
}

export function loadMetadata(): SessionMetadataFile {
  try {
    const path = getMetadataPath();
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return { version: 1, sessions: {} };
}

export function saveMetadata(metadata: SessionMetadataFile): void {
  const dir = getDataDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getMetadataPath(), JSON.stringify(metadata, null, 2) + '\n');
}

export function getSessionMeta(sessionId: string): SessionMetadataEntry | null {
  const metadata = loadMetadata();
  return metadata.sessions[sessionId] || null;
}

export function addTags(sessionId: string, tags: string[]): void {
  const metadata = loadMetadata();
  if (!metadata.sessions[sessionId]) {
    metadata.sessions[sessionId] = {};
  }
  const existing = metadata.sessions[sessionId].tags || [];
  const merged = [...new Set([...existing, ...tags])];
  metadata.sessions[sessionId].tags = merged;
  saveMetadata(metadata);
}

export function removeTags(sessionId: string, tags: string[]): void {
  const metadata = loadMetadata();
  if (!metadata.sessions[sessionId]?.tags) return;
  metadata.sessions[sessionId].tags = metadata.sessions[sessionId].tags!.filter(
    (t) => !tags.includes(t),
  );
  saveMetadata(metadata);
}

export function setSessionName(sessionId: string, name: string): void {
  const metadata = loadMetadata();
  if (!metadata.sessions[sessionId]) {
    metadata.sessions[sessionId] = {};
  }
  metadata.sessions[sessionId].name = name;
  saveMetadata(metadata);
}
