import blessed from 'blessed';
import Fuse from 'fuse.js';
import { spawn } from 'node:child_process';
import type { Session } from '../core/types.js';
import {
  loadAllSessions,
  findProjectDir,
  readSessionMessages,
} from '../core/sessionReader.js';
import {
  addTags,
  removeTags,
  getProjectSessionIds,
  listProjects,
  createProject,
  addSessionsToProject,
  removeSessionsFromProject,
} from '../core/metadataStore.js';
import { loadConfig } from '../utils/config.js';
import {
  truncate,
  formatDate,
  formatRelativeDate,
  stripSystemTags,
  cleanSessionTitle,
} from '../utils/format.js';

type Pane = 'projects' | 'sessions' | 'preview';

export function launchTui(opts: {
  project?: string;
  projectName?: string;
  all?: boolean;
}): void {
  // ── Load data ──
  let projectDirs: string[] | undefined;
  if (!opts.all && opts.project) {
    const dir = findProjectDir(opts.project);
    if (dir) projectDirs = [dir];
  } else if (!opts.all) {
    const cwd = process.cwd();
    const dir = findProjectDir(cwd);
    if (dir) projectDirs = [dir];
  }

  const baseSessions = loadAllSessions(projectDirs)
    .filter((s) => !s.archived)
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());

  // ── State ──
  let activePane: Pane = 'sessions';
  let activeProjectName: string | null = opts.projectName || null;
  let filteredSessions: Session[] = [];
  let sortMode: 'date' | 'messages' | 'branch' = 'date';
  let searchQuery = '';
  let projectIndex = 0;
  let sessionIndex = 0;

  // ── Screen ──
  const screen = blessed.screen({
    smartCSR: true,
    title: 'claude-sessions',
    fullUnicode: true,
  });

  // ── Project pane (left, ~18%) ──
  const projectPane = blessed.list({
    parent: screen,
    label: ' Projects ',
    top: 0,
    left: 0,
    width: '18%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: '#00d4aa' },
      selected: { bg: '#1a3a4a', fg: 'white', bold: true },
      item: { fg: '#888888' },
      label: { fg: '#00d4aa', bold: true },
      focus: { border: { fg: '#00d4aa' } },
    },
    keys: true,
    vi: true,
    mouse: true,
    items: [],
  });

  // ── Session pane (middle, ~32%) ──
  const sessionPane = blessed.list({
    parent: screen,
    label: ' Sessions ',
    top: 0,
    left: '18%',
    width: '32%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: '#444444' },
      selected: { bg: '#1a3a4a', fg: 'white', bold: true },
      item: { fg: '#cccccc' },
      label: { fg: '#00d4aa', bold: true },
      focus: { border: { fg: '#00d4aa' } },
    },
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', track: { bg: '#222222' }, style: { bg: '#00d4aa' } },
    items: [],
  });

  // ── Preview pane (right, ~50%) ──
  const previewPane = blessed.box({
    parent: screen,
    label: ' Preview ',
    top: 0,
    left: '50%',
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: '#444444' },
      label: { fg: '#00d4aa', bold: true },
      focus: { border: { fg: '#00d4aa' } },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: { ch: ' ', track: { bg: '#222222' }, style: { bg: '#00d4aa' } },
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    content: '',
  });

  // ── Status bar ──
  const statusBar = blessed.box({
    parent: screen,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: { border: { fg: '#333333' }, fg: '#888888' },
    tags: true,
    content: '',
  });

  // ── Fuse search ──
  let fuse = new Fuse(baseSessions, {
    keys: ['summary', 'firstPrompt', 'branch', 'name', 'tags'],
    threshold: 0.4,
    ignoreLocation: true,
  });

  // ── Helpers ──

  function getProjectNames(): string[] {
    return Object.keys(listProjects());
  }

  function refreshProjectPane(): void {
    const names = getProjectNames();
    const items = [
      activeProjectName === null ? '{#00d4aa-fg}> All{/#00d4aa-fg}' : '  All',
      ...names.map((n) =>
        n === activeProjectName ? `{#00d4aa-fg}> ${n}{/#00d4aa-fg}` : `  ${n}`,
      ),
    ];
    projectPane.setItems(items);
    // Set selection to match active project
    const idx = activeProjectName === null ? 0 : names.indexOf(activeProjectName) + 1;
    projectPane.select(idx);
    projectIndex = idx;
  }

  function getFilteredSessions(): Session[] {
    let sessions = [...baseSessions];

    // Project filter
    if (activeProjectName) {
      const ids = new Set(getProjectSessionIds(activeProjectName));
      sessions = sessions.filter((s) => ids.has(s.id));
    }

    // Search filter
    if (searchQuery) {
      fuse = new Fuse(sessions, {
        keys: ['summary', 'firstPrompt', 'branch', 'name', 'tags'],
        threshold: 0.4,
        ignoreLocation: true,
      });
      sessions = fuse.search(searchQuery).map((r) => r.item);
    }

    // Sort
    switch (sortMode) {
      case 'messages':
        sessions.sort((a, b) => b.messageCount - a.messageCount);
        break;
      case 'branch':
        sessions.sort((a, b) => a.branch.localeCompare(b.branch));
        break;
      default:
        sessions.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    }

    return sessions;
  }

  function refreshSessionPane(): void {
    filteredSessions = getFilteredSessions();
    const items = filteredSessions.map((s, i) => {
      const title = cleanSessionTitle(s);
      const num = String(i + 1).padStart(3);
      return ` ${num}  ${truncate(title, 35)}`;
    });
    sessionPane.setItems(items);
    sessionPane.setLabel(` Sessions (${filteredSessions.length}) `);

    if (filteredSessions.length > 0) {
      sessionIndex = 0;
      sessionPane.select(0);
      refreshPreview();
    } else {
      previewPane.setContent('\n  {#666666-fg}No sessions found{/#666666-fg}');
      previewPane.setLabel(' Preview ');
    }
  }

  function refreshPreview(): void {
    const session = filteredSessions[sessionIndex];
    if (!session) {
      previewPane.setContent('\n  {#666666-fg}No session selected{/#666666-fg}');
      return;
    }

    const messages = readSessionMessages(session.jsonlPath, 20);
    const title = cleanSessionTitle(session);

    let c = '';
    c += `\n  {bold}{white-fg}${title}{/white-fg}{/bold}\n\n`;
    c += `  {#00d4aa-fg}Branch:{/#00d4aa-fg}    {#5588cc-fg}${session.branch}{/#5588cc-fg}\n`;
    c += `  {#00d4aa-fg}Date:{/#00d4aa-fg}      {#888888-fg}${formatDate(session.created.toISOString())}{/#888888-fg}\n`;
    c += `  {#00d4aa-fg}Messages:{/#00d4aa-fg}  {white-fg}${session.messageCount}{/white-fg}\n`;
    c += `  {#00d4aa-fg}ID:{/#00d4aa-fg}        {#555555-fg}${session.id.slice(0, 8)}{/#555555-fg}\n`;

    if (session.tags.length > 0) {
      c += `  {#00d4aa-fg}Tags:{/#00d4aa-fg}     ${session.tags.map((t) => `{#00d4aa-fg}#${t}{/#00d4aa-fg}`).join(' ')}\n`;
    }

    c += '\n  {#333333-fg}----------------------------------------{/#333333-fg}\n';

    if (messages.length === 0) {
      c += '\n  {#666666-fg}No messages in session file{/#666666-fg}\n';
    } else {
      for (const msg of messages) {
        const isUser = msg.type === 'user';
        const color = isUser ? '#4ec9b0' : '#569cd6';
        const label = isUser ? '> You' : '< Claude';
        const text = stripSystemTags(msg.content);
        if (!text) continue;
        c += `\n  {${color}-fg}{bold}${label}{/bold}{/${color}-fg}\n`;
        for (const line of truncate(text, 350).split('\n')) {
          c += `  {#bbbbbb-fg}${line}{/#bbbbbb-fg}\n`;
        }
      }
    }

    previewPane.setContent(c);
    previewPane.setLabel(` Preview -- ${truncate(title, 25)} `);
    previewPane.scrollTo(0);
  }

  function updateStatusBar(): void {
    const proj = activeProjectName ? `[${activeProjectName}]` : 'All';
    const search = searchQuery ? `  search: "${searchQuery}"` : '';
    statusBar.setContent(
      ` {#00d4aa-fg}Tab{/#00d4aa-fg} switch pane  |  {#888888-fg}${proj}  sort:${sortMode}${search}  ${filteredSessions.length}/${baseSessions.length}{/#888888-fg}  |  {#00d4aa-fg}?{/#00d4aa-fg} help`,
    );
  }

  function focusPane(pane: Pane): void {
    activePane = pane;
    // Update border colors to show focus
    projectPane.style.border.fg = pane === 'projects' ? '#00d4aa' : '#444444';
    sessionPane.style.border.fg = pane === 'sessions' ? '#00d4aa' : '#444444';
    previewPane.style.border.fg = pane === 'preview' ? '#00d4aa' : '#444444';

    if (pane === 'projects') projectPane.focus();
    else if (pane === 'sessions') sessionPane.focus();
    else previewPane.focus();
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
      console.error('Claude Code not found. Is it installed?');
      process.exit(1);
    });
    child.on('exit', (code) => process.exit(code || 0));
  }

  function showInput(label: string, callback: (value: string) => void): void {
    const input = blessed.textbox({
      parent: screen,
      label: ` ${label} `,
      top: 'center',
      left: 'center',
      width: 50,
      height: 3,
      border: { type: 'line' },
      style: {
        border: { fg: '#00d4aa' },
        label: { fg: '#00d4aa' },
        fg: 'white',
      },
      inputOnFocus: true,
    });
    input.focus();
    screen.render();
    input.on('submit', (value: string) => {
      input.destroy();
      if (value && value.trim()) callback(value.trim());
      focusPane(activePane);
    });
    input.on('cancel', () => {
      input.destroy();
      focusPane(activePane);
    });
  }

  // ── Events: Project pane ──

  projectPane.on('select', (_item: unknown, index: number) => {
    const names = getProjectNames();
    if (index === 0) {
      activeProjectName = null;
    } else {
      activeProjectName = names[index - 1] || null;
    }
    refreshProjectPane();
    refreshSessionPane();
    updateStatusBar();
    screen.render();
  });

  // ── Events: Session pane ──

  sessionPane.on('select item', (_item: unknown, index: number) => {
    sessionIndex = index;
    refreshPreview();
    screen.render();
  });

  sessionPane.on('select', (_item: unknown, index: number) => {
    const session = filteredSessions[index];
    if (session) openSession(session);
  });

  // ── Global keys ──

  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  // Tab to switch panes
  screen.key(['tab'], () => {
    const order: Pane[] = ['projects', 'sessions', 'preview'];
    const next = order[(order.indexOf(activePane) + 1) % 3];
    focusPane(next);
  });

  screen.key(['S-tab'], () => {
    const order: Pane[] = ['projects', 'sessions', 'preview'];
    const prev = order[(order.indexOf(activePane) + 2) % 3];
    focusPane(prev);
  });

  // Search
  screen.key('/', () => {
    showInput('Search', (value) => {
      searchQuery = value;
      refreshSessionPane();
      updateStatusBar();
      screen.render();
    });
  });

  // Clear search
  screen.key('escape', () => {
    if (searchQuery) {
      searchQuery = '';
      refreshSessionPane();
      updateStatusBar();
      screen.render();
    }
  });

  // Sort toggle
  screen.key('s', () => {
    if (activePane === 'projects') return; // Don't interfere with list nav
    const modes: Array<'date' | 'messages' | 'branch'> = ['date', 'messages', 'branch'];
    sortMode = modes[(modes.indexOf(sortMode) + 1) % 3];
    refreshSessionPane();
    updateStatusBar();
    screen.render();
  });

  // Tag
  screen.key('t', () => {
    const session = filteredSessions[sessionIndex];
    if (!session) return;
    showInput('Add tags (comma-separated)', (value) => {
      const tags = value.split(',').map((t) => t.trim()).filter(Boolean);
      addTags(session.id, tags);
      session.tags = [...new Set([...session.tags, ...tags])];
      refreshPreview();
      screen.render();
    });
  });

  // Untag
  screen.key('T', () => {
    const session = filteredSessions[sessionIndex];
    if (!session || session.tags.length === 0) return;

    const popup = blessed.list({
      parent: screen,
      label: ' Remove tag ',
      top: 'center',
      left: 'center',
      width: 40,
      height: Math.min(session.tags.length + 4, 15),
      border: { type: 'line' },
      style: {
        border: { fg: '#00d4aa' },
        selected: { bg: '#1a3a4a', fg: 'white' },
        item: { fg: '#cccccc' },
        label: { fg: '#00d4aa' },
      },
      keys: true,
      vi: true,
      items: session.tags,
    });
    popup.focus();
    screen.render();

    popup.on('select', (_item: unknown, index: number) => {
      const tag = session.tags[index];
      removeTags(session.id, [tag]);
      session.tags = session.tags.filter((t) => t !== tag);
      popup.destroy();
      refreshPreview();
      focusPane(activePane);
    });
    popup.key(['escape', 'q'], () => {
      popup.destroy();
      focusPane(activePane);
    });
  });

  // Add to project
  screen.key('a', () => {
    const session = filteredSessions[sessionIndex];
    if (!session) return;

    const names = getProjectNames();
    const items = [
      ...names.map((n) => {
        const proj = listProjects()[n];
        const already = proj.sessions.includes(session.id);
        return already ? `  ${n} (added)` : `  ${n}`;
      }),
      '  + New Project',
    ];

    const popup = blessed.list({
      parent: screen,
      label: ' Add to project ',
      top: 'center',
      left: 'center',
      width: 45,
      height: Math.min(items.length + 4, 15),
      border: { type: 'line' },
      style: {
        border: { fg: '#00d4aa' },
        selected: { bg: '#1a3a4a', fg: 'white' },
        item: { fg: '#cccccc' },
        label: { fg: '#00d4aa' },
      },
      keys: true,
      vi: true,
      items,
    });
    popup.focus();
    screen.render();

    popup.on('select', (_item: unknown, index: number) => {
      popup.destroy();
      if (index === items.length - 1) {
        // New project
        showInput('New project name', (name) => {
          try { createProject(name); } catch { /* exists */ }
          addSessionsToProject(name, [session.id]);
          refreshProjectPane();
          screen.render();
        });
      } else {
        addSessionsToProject(names[index], [session.id]);
        refreshProjectPane();
        focusPane(activePane);
      }
    });
    popup.key(['escape', 'q'], () => {
      popup.destroy();
      focusPane(activePane);
    });
  });

  // New project from project pane
  screen.key('n', () => {
    showInput('New project name', (name) => {
      try { createProject(name); } catch { /* exists */ }
      refreshProjectPane();
      updateStatusBar();
      screen.render();
    });
  });

  // Remove session from active project
  screen.key('r', () => {
    const session = filteredSessions[sessionIndex];
    if (!session || !activeProjectName) return;
    removeSessionsFromProject(activeProjectName, [session.id]);
    refreshSessionPane();
    updateStatusBar();
    screen.render();
  });

  // Help
  screen.key('?', () => {
    const help = blessed.box({
      parent: screen,
      label: ' Keyboard Shortcuts ',
      top: 'center',
      left: 'center',
      width: 50,
      height: 22,
      border: { type: 'line' },
      style: { border: { fg: '#00d4aa' }, label: { fg: '#00d4aa' } },
      tags: true,
      content: [
        '',
        '  {#00d4aa-fg}NAVIGATE{/#00d4aa-fg}',
        '  Tab / Shift+Tab    Switch pane',
        '  Up / Down          Move in list',
        '  Enter              Select project / open session',
        '',
        '  {#00d4aa-fg}SEARCH & SORT{/#00d4aa-fg}',
        '  /                  Search sessions',
        '  Esc                Clear search',
        '  s                  Cycle sort: date/msgs/branch',
        '',
        '  {#00d4aa-fg}ORGANIZE{/#00d4aa-fg}',
        '  t                  Add tags',
        '  T (Shift+t)        Remove a tag',
        '  a                  Add session to project',
        '  n                  Create new project',
        '  r                  Remove from active project',
        '',
        '  {#00d4aa-fg}q{/#00d4aa-fg} quit    {#00d4aa-fg}?{/#00d4aa-fg} this help',
      ].join('\n'),
    });
    screen.onceKey([], () => {
      help.destroy();
      screen.render();
    });
    screen.render();
  });

  // ── Initial render ──
  refreshProjectPane();
  refreshSessionPane();
  updateStatusBar();
  focusPane('sessions');
  screen.render();
}
