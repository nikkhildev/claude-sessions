import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type {
  SessionMetadataFile,
  SessionMetadataEntry,
  ProjectEntry,
} from './types.js';

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

// --- Project CRUD ---

export function createProject(
  name: string,
  description?: string,
): ProjectEntry {
  const metadata = loadMetadata();
  if (!metadata.projects) metadata.projects = {};
  if (metadata.projects[name]) {
    throw new Error(`Project "${name}" already exists`);
  }
  const entry: ProjectEntry = {
    sessions: [],
    created: new Date().toISOString(),
    ...(description ? { description } : {}),
  };
  metadata.projects[name] = entry;
  saveMetadata(metadata);
  return entry;
}

export function listProjects(): Record<string, ProjectEntry> {
  const metadata = loadMetadata();
  return metadata.projects || {};
}

export function getProject(name: string): ProjectEntry | null {
  const metadata = loadMetadata();
  return metadata.projects?.[name] || null;
}

export function addSessionsToProject(
  projectName: string,
  sessionIds: string[],
): void {
  const metadata = loadMetadata();
  if (!metadata.projects?.[projectName]) {
    throw new Error(`Project "${projectName}" not found`);
  }
  const existing = metadata.projects[projectName].sessions;
  metadata.projects[projectName].sessions = [
    ...new Set([...existing, ...sessionIds]),
  ];
  saveMetadata(metadata);
}

export function removeSessionsFromProject(
  projectName: string,
  sessionIds: string[],
): void {
  const metadata = loadMetadata();
  if (!metadata.projects?.[projectName]) {
    throw new Error(`Project "${projectName}" not found`);
  }
  metadata.projects[projectName].sessions = metadata.projects[
    projectName
  ].sessions.filter((id) => !sessionIds.includes(id));
  saveMetadata(metadata);
}

export function deleteProject(name: string): void {
  const metadata = loadMetadata();
  if (!metadata.projects?.[name]) {
    throw new Error(`Project "${name}" not found`);
  }
  delete metadata.projects[name];
  saveMetadata(metadata);
}

export function getProjectSessionIds(projectName: string): string[] {
  const metadata = loadMetadata();
  return metadata.projects?.[projectName]?.sessions || [];
}
