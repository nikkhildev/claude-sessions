export interface SessionIndexEntry {
  sessionId: string;
  fullPath: string;
  fileMtime: number;
  firstPrompt: string;
  summary: string;
  messageCount: number;
  created: string;
  modified: string;
  gitBranch: string;
  projectPath: string;
  isSidechain: boolean;
}

export interface SessionIndex {
  version: number;
  entries: SessionIndexEntry[];
}

export interface Session {
  id: string;
  summary: string;
  firstPrompt: string;
  branch: string;
  projectPath: string;
  projectDir: string;
  messageCount: number;
  created: Date;
  modified: Date;
  isSidechain: boolean;
  jsonlPath: string;
  tags: string[];
  name: string | null;
  archived: boolean;
}

export interface SessionMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SessionMetadataFile {
  version: 1;
  sessions: Record<string, SessionMetadataEntry>;
}

export interface SessionMetadataEntry {
  tags?: string[];
  name?: string;
  archived?: boolean;
  notes?: string;
}

export interface AppConfig {
  defaultProject: string | null;
  defaultLimit: number;
  defaultSort: 'date' | 'messages' | 'branch';
  claudePath: string;
  previewMessages: number;
}

export interface ListOptions {
  project?: string;
  all?: boolean;
  limit: number;
  sort: 'date' | 'messages' | 'branch';
  branch?: string;
  tag?: string;
  since?: string;
  json?: boolean;
}

export interface SearchOptions {
  project?: string;
  all?: boolean;
  limit: number;
  context: number;
}

export interface ShowOptions {
  full?: boolean;
  messages: number;
  json?: boolean;
}
