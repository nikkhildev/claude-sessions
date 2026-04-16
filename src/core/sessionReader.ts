import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, basename, dirname } from 'node:path';
import { homedir } from 'node:os';
import type { Session, SessionIndex, SessionMessage } from './types.js';
import { cleanMessageContent } from '../utils/format.js';
import { loadMetadata } from './metadataStore.js';

const CLAUDE_DIR = join(homedir(), '.claude');
const PROJECTS_DIR = join(CLAUDE_DIR, 'projects');

export function getClaudeDir(): string {
  return CLAUDE_DIR;
}

export function getProjectsDir(): string {
  return PROJECTS_DIR;
}

export function discoverProjects(): string[] {
  if (!existsSync(PROJECTS_DIR)) return [];
  return readdirSync(PROJECTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => join(PROJECTS_DIR, d.name));
}

export function findProjectDir(projectPath?: string): string | null {
  if (!projectPath) return null;

  // Try direct encoded path match
  const encoded = projectPath.replace(/\//g, '-');
  const candidate = join(PROJECTS_DIR, encoded);
  if (existsSync(candidate)) return candidate;

  // Try finding by projectPath in index entries
  const projects = discoverProjects();
  for (const dir of projects) {
    const indexPath = join(dir, 'sessions-index.json');
    if (existsSync(indexPath)) {
      try {
        const index: SessionIndex = JSON.parse(readFileSync(indexPath, 'utf-8'));
        if (index.entries.some((e) => e.projectPath === projectPath)) {
          return dir;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

export function loadSessionsFromIndex(
  indexPath: string,
  projectDir: string,
): Session[] {
  if (!existsSync(indexPath)) return [];
  try {
    const raw = readFileSync(indexPath, 'utf-8');
    const index: SessionIndex = JSON.parse(raw);
    const metadata = loadMetadata();

    return index.entries.map((entry) => {
      const meta = metadata.sessions[entry.sessionId];
      const jsonlPath = join(projectDir, entry.sessionId + '.jsonl');
      return {
        id: entry.sessionId,
        summary: entry.summary || '',
        firstPrompt: entry.firstPrompt || '',
        branch: entry.gitBranch || '',
        projectPath: entry.projectPath || '',
        projectDir,
        messageCount: entry.messageCount || 0,
        created: new Date(entry.created),
        modified: new Date(entry.modified),
        isSidechain: entry.isSidechain || false,
        jsonlPath: existsSync(jsonlPath) ? jsonlPath : entry.fullPath,
        tags: meta?.tags || [],
        name: meta?.name || null,
        archived: meta?.archived || false,
      };
    });
  } catch {
    return [];
  }
}

export function parseSessionFromJsonl(jsonlPath: string): Session | null {
  if (!existsSync(jsonlPath)) return null;
  try {
    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    let sessionId = basename(jsonlPath, '.jsonl');
    let branch = '';
    let cwd = '';
    let firstTimestamp = '';
    let lastTimestamp = '';
    let firstPrompt = '';
    let userCount = 0;
    let assistantCount = 0;

    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (!branch && obj.gitBranch) branch = obj.gitBranch;
        if (!cwd && obj.cwd) cwd = obj.cwd;
        if (!firstTimestamp && obj.timestamp) firstTimestamp = obj.timestamp;
        if (obj.timestamp) lastTimestamp = obj.timestamp;
        if (obj.sessionId) sessionId = obj.sessionId;

        if (obj.type === 'user') {
          userCount++;
          if (!firstPrompt) {
            const msg = obj.message;
            if (typeof msg === 'object' && msg?.content) {
              firstPrompt = cleanMessageContent(msg.content);
            }
          }
        } else if (obj.type === 'assistant') {
          assistantCount++;
        }
      } catch {
        // Skip malformed lines
      }
    }

    const metadata = loadMetadata();
    const meta = metadata.sessions[sessionId];

    return {
      id: sessionId,
      summary: '',
      firstPrompt,
      branch,
      projectPath: cwd,
      projectDir: dirname(jsonlPath),
      messageCount: userCount + assistantCount,
      created: firstTimestamp
        ? new Date(firstTimestamp)
        : new Date(statSync(jsonlPath).birthtimeMs),
      modified: lastTimestamp
        ? new Date(lastTimestamp)
        : new Date(statSync(jsonlPath).mtimeMs),
      isSidechain: false,
      jsonlPath,
      tags: meta?.tags || [],
      name: meta?.name || null,
      archived: meta?.archived || false,
    };
  } catch {
    return null;
  }
}

export function loadAllSessions(projectDirs?: string[]): Session[] {
  const dirs = projectDirs || discoverProjects();
  const sessionsById = new Map<string, Session>();

  for (const dir of dirs) {
    // Load from index first
    const indexPath = join(dir, 'sessions-index.json');
    const indexSessions = loadSessionsFromIndex(indexPath, dir);
    for (const s of indexSessions) {
      sessionsById.set(s.id, s);
    }

    // Find JSONL files not in index
    if (existsSync(dir)) {
      try {
        const files = readdirSync(dir).filter((f) => f.endsWith('.jsonl'));
        for (const file of files) {
          const id = basename(file, '.jsonl');
          if (!sessionsById.has(id)) {
            const session = parseSessionFromJsonl(join(dir, file));
            if (session) {
              sessionsById.set(session.id, session);
            }
          }
        }
      } catch {
        // Skip directories we can't read
      }
    }
  }

  return Array.from(sessionsById.values());
}

export function readSessionMessages(
  jsonlPath: string,
  maxMessages?: number,
): SessionMessage[] {
  if (!existsSync(jsonlPath)) return [];
  const messages: SessionMessage[] = [];

  try {
    const content = readFileSync(jsonlPath, 'utf-8');
    const lines = content.split('\n').filter((l) => l.trim());

    for (const line of lines) {
      if (maxMessages && messages.length >= maxMessages) break;
      try {
        const obj = JSON.parse(line);
        if (obj.type === 'user' || obj.type === 'assistant') {
          const msg = obj.message;
          let text = '';
          if (typeof msg === 'string') {
            text = msg;
          } else if (msg?.content) {
            text = cleanMessageContent(msg.content);
          }
          if (text) {
            messages.push({
              type: obj.type,
              content: text,
              timestamp: obj.timestamp || '',
            });
          }
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    return [];
  }

  return messages;
}
