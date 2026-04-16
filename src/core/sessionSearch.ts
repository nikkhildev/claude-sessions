import Fuse from 'fuse.js';
import type { Session, SessionMessage } from './types.js';
import { readSessionMessages } from './sessionReader.js';

export interface SearchResult {
  session: Session;
  matches: SearchMatch[];
  score: number;
}

export interface SearchMatch {
  type: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SessionText {
  session: Session;
  text: string;
  messages: SessionMessage[];
}

function loadSessionTexts(sessions: Session[]): SessionText[] {
  return sessions
    .map((session) => {
      const messages = readSessionMessages(session.jsonlPath);
      const text = messages.map((m) => m.content).join('\n');
      return { session, text, messages };
    })
    .filter((st) => st.text.length > 0);
}

export function searchSessions(
  sessions: Session[],
  query: string,
  limit?: number,
): SearchResult[] {
  const sessionTexts = loadSessionTexts(sessions);

  const fuse = new Fuse(sessionTexts, {
    keys: ['text', 'session.summary', 'session.firstPrompt'],
    threshold: 0.4,
    includeScore: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  });

  const fuseResults = fuse.search(query, { limit: limit || 10 });

  return fuseResults.map((result) => {
    const { session, messages } = result.item;
    const lowerQuery = query.toLowerCase();

    // Find messages that contain the query terms
    const matchingMessages = messages.filter((m) =>
      m.content.toLowerCase().includes(lowerQuery),
    );

    return {
      session,
      matches: matchingMessages.slice(0, 5).map((m) => ({
        type: m.type,
        content: m.content,
        timestamp: m.timestamp,
      })),
      score: result.score || 0,
    };
  });
}
