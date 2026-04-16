import blessed from 'blessed';
import Fuse from 'fuse.js';
import { spawn } from 'node:child_process';
import type { Session } from '../core/types.js';
import {
  loadAllSessions,
  findProjectDir,
} from '../core/sessionReader.js';
import { addTags, getProjectSessionIds } from '../core/metadataStore.js';
import { loadConfig } from '../utils/config.js';
import { createSessionList, updateListItems } from './sessionList.js';
import { createPreview, updatePreview } from './preview.js';
import { createSearchBar, createStatusBar } from './statusBar.js';

export function launchTui(opts: {
  project?: string;
  projectName?: string;
  all?: boolean;
}): void {
  let projectDirs: string[] | undefined;
  if (!opts.all && opts.project) {
    const dir = findProjectDir(opts.project);
    if (dir) projectDirs = [dir];
  } else if (!opts.all) {
    const cwd = process.cwd();
    const dir = findProjectDir(cwd);
    if (dir) projectDirs = [dir];
  }

  let allSessions = loadAllSessions(projectDirs)
    .filter((s) => !s.archived)
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());

  // Filter to named project if specified
  if (opts.projectName) {
    const projectIds = new Set(getProjectSessionIds(opts.projectName));
    allSessions = allSessions.filter((s) => projectIds.has(s.id));
  }

  let filteredSessions = [...allSessions];
  let sortMode: 'date' | 'messages' | 'branch' = 'date';
  let searchQuery = '';
  let selectedIndex = 0;

  const screen = blessed.screen({
    smartCSR: true,
    title: 'claude-sessions',
    fullUnicode: true,
  });

  const searchBar = createSearchBar(screen);
  const sessionList = createSessionList(
    screen,
    filteredSessions,
    openSession,
  );
  const preview = createPreview(screen);
  const statusBar = createStatusBar(screen, allSessions.length);

  const fuse = new Fuse(allSessions, {
    keys: ['summary', 'firstPrompt', 'branch', 'name', 'tags'],
    threshold: 0.4,
    ignoreLocation: true,
  });

  function refreshList(): void {
    if (searchQuery) {
      const results = fuse.search(searchQuery);
      filteredSessions = results.map((r) => r.item);
    } else {
      filteredSessions = [...allSessions];
    }

    switch (sortMode) {
      case 'messages':
        filteredSessions.sort((a, b) => b.messageCount - a.messageCount);
        break;
      case 'branch':
        filteredSessions.sort((a, b) =>
          a.branch.localeCompare(b.branch),
        );
        break;
      case 'date':
      default:
        filteredSessions.sort(
          (a, b) => b.modified.getTime() - a.modified.getTime(),
        );
    }

    updateListItems(sessionList, filteredSessions);

    if (filteredSessions.length > 0) {
      sessionList.select(0);
      updatePreview(preview, filteredSessions[0]);
    } else {
      preview.setContent('No sessions match your search');
    }

    statusBar.setContent(
      ` {bold}↑↓{/bold} Navigate  {bold}Enter{/bold} Open  {bold}/{/bold} Search  {bold}t{/bold} Tag  {bold}s{/bold} Sort  {bold}?{/bold} Help  {bold}q{/bold} Quit  |  Sort: ${sortMode}  |  ${filteredSessions.length}/${allSessions.length} sessions`,
    );
    screen.render();
  }

  function openSession(session: Session): void {
    screen.destroy();
    const config = loadConfig();
    const child = spawn(config.claudePath, ['--resume', session.id], {
      stdio: 'inherit',
      cwd: session.projectPath || process.cwd(),
    });
    child.on('error', () => {
      console.error('Failed to open Claude Code. Is it installed?');
      process.exit(1);
    });
    child.on('exit', (code) => process.exit(code || 0));
  }

  // Update preview on selection change
  sessionList.on('select item', (_item: unknown, index: number) => {
    selectedIndex = index;
    if (filteredSessions[index]) {
      updatePreview(preview, filteredSessions[index]);
      screen.render();
    }
  });

  // Global key bindings
  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  screen.key('/', () => {
    searchBar.focus();
    screen.render();
  });

  searchBar.on('submit', (value: string) => {
    searchQuery = value || '';
    refreshList();
    sessionList.focus();
  });

  searchBar.on('cancel', () => {
    searchQuery = '';
    searchBar.clearValue();
    refreshList();
    sessionList.focus();
  });

  screen.key('s', () => {
    const modes: Array<'date' | 'messages' | 'branch'> = [
      'date',
      'messages',
      'branch',
    ];
    const currentIdx = modes.indexOf(sortMode);
    sortMode = modes[(currentIdx + 1) % modes.length];
    refreshList();
  });

  screen.key('t', () => {
    const session = filteredSessions[selectedIndex];
    if (!session) return;

    const input = blessed.textbox({
      parent: screen,
      label: ' Add tags (comma-separated) ',
      top: 'center',
      left: 'center',
      width: 50,
      height: 3,
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        focus: { border: { fg: 'green' } },
      },
      inputOnFocus: true,
    });

    input.focus();
    screen.render();

    input.on('submit', (value: string) => {
      if (value) {
        const tags = value
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        addTags(session.id, tags);
        session.tags = [...new Set([...session.tags, ...tags])];
        updateListItems(sessionList, filteredSessions);
        updatePreview(preview, session);
      }
      input.destroy();
      sessionList.focus();
      screen.render();
    });

    input.on('cancel', () => {
      input.destroy();
      sessionList.focus();
      screen.render();
    });
  });

  screen.key('?', () => {
    const help = blessed.box({
      parent: screen,
      label: ' Help ',
      top: 'center',
      left: 'center',
      width: 50,
      height: 16,
      border: { type: 'line' },
      style: { border: { fg: 'blue' } },
      tags: true,
      content: [
        '',
        '  {bold}Keyboard Shortcuts{/bold}',
        '',
        '  {bold}↑/↓ or j/k{/bold}   Navigate sessions',
        '  {bold}Enter{/bold}         Open session in Claude Code',
        '  {bold}/{/bold}             Search sessions',
        '  {bold}t{/bold}             Tag selected session',
        '  {bold}s{/bold}             Toggle sort (date/msgs/branch)',
        '  {bold}?{/bold}             Show this help',
        '  {bold}q or Ctrl-C{/bold}   Quit',
        '',
        '  Press any key to close',
      ].join('\n'),
    });

    screen.onceKey([], () => {
      help.destroy();
      screen.render();
    });
    screen.render();
  });

  // Initial render
  if (filteredSessions.length > 0) {
    updatePreview(preview, filteredSessions[0]);
  }
  sessionList.focus();
  screen.render();
}
