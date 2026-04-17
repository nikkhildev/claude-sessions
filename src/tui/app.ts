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
import {
  buildDemoSessions,
  buildDemoMessages,
  buildDemoProjectList,
} from '../core/demoData.js';

type Pane = 'projects' | 'sessions' | 'preview';

export function launchTui(opts: {
  project?: string;
  projectName?: string;
  all?: boolean;
  demo?: boolean;
}): void {
  // ── Demo mode: use fake in-memory data ──
  const demoMode = opts.demo === true;
  const demoProjectsList = demoMode ? buildDemoProjectList() : [];

  // ── Load data ──
  let baseSessions: Session[];
  if (demoMode) {
    baseSessions = buildDemoSessions().sort(
      (a, b) => b.modified.getTime() - a.modified.getTime(),
    );
  } else {
    let projectDirs: string[] | undefined;
    if (!opts.all && opts.project) {
      const dir = findProjectDir(opts.project);
      if (dir) projectDirs = [dir];
    } else if (!opts.all) {
      const cwd = process.cwd();
      const dir = findProjectDir(cwd);
      if (dir) projectDirs = [dir];
    }
    baseSessions = loadAllSessions(projectDirs)
      .filter((s) => !s.archived)
      .sort((a, b) => b.modified.getTime() - a.modified.getTime());
  }

  // ── State ──
  let modalOpen = false;
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
    border: { type: 'line', fg: '#444444' },
    style: {
      border: { fg: '#444444' },
      selected: { bg: '#1a3a4a', fg: 'white', bold: true },
      item: { fg: '#888888' },
      label: { fg: '#00d4aa', bold: true },
    },
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
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
    border: { type: 'line', fg: '#444444' },
    style: {
      border: { fg: '#444444' },
      selected: { bg: '#1a3a4a', fg: 'white', bold: true },
      item: { fg: '#cccccc' },
      label: { fg: '#00d4aa', bold: true },
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
    border: { type: 'line', fg: '#444444' },
    style: {
      border: { fg: '#444444' },
      label: { fg: '#00d4aa', bold: true },
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
    if (demoMode) return demoProjectsList.map((p) => p.name);
    return Object.keys(listProjects());
  }

  function getProjectIds(name: string): string[] {
    if (demoMode) {
      return demoProjectsList.find((p) => p.name === name)?.sessions || [];
    }
    return getProjectSessionIds(name);
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
      const ids = new Set(getProjectIds(activeProjectName));
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

    const messages = demoMode
      ? buildDemoMessages(session.id)
      : readSessionMessages(session.jsonlPath, 20);
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
    const search = searchQuery ? `  {#ff9966-fg}search:"${searchQuery}" (esc to clear){/#ff9966-fg}` : '';
    const demoTag = demoMode ? '{#ff9966-fg}[DEMO]{/#ff9966-fg}  ' : '';
    const k = (key: string, desc: string): string =>
      `{#00d4aa-fg}${key}{/#00d4aa-fg} ${desc}`;
    statusBar.setContent(
      ` ${demoTag}${k('←→', 'pane')}  ${k('↵', 'open')}  ${k('/', 'search')}  ${k('t', 'tag')}  ${k('a', 'add to project')}  ${k('n', 'new project')}  ${k('?', 'help')}  ${k('q', 'quit')}  {#555555-fg}|{/#555555-fg}  {#888888-fg}${proj} · ${filteredSessions.length}/${baseSessions.length} · sort:${sortMode}${search}{/#888888-fg}`,
    );
  }

  function setBorder(
    widget: blessed.Widgets.BlessedElement,
    color: string,
  ): void {
    // blessed requires direct assignment to .border.fg (not .style.border.fg)
    // to update live
    const w = widget as unknown as {
      border: { fg: string };
      style: { border: { fg: string } };
    };
    if (w.border) w.border.fg = color;
    if (w.style?.border) w.style.border.fg = color;
  }

  function focusPane(pane: Pane): void {
    activePane = pane;
    setBorder(projectPane, pane === 'projects' ? '#00d4aa' : '#444444');
    setBorder(sessionPane, pane === 'sessions' ? '#00d4aa' : '#444444');
    setBorder(previewPane, pane === 'preview' ? '#00d4aa' : '#444444');

    if (pane === 'projects') projectPane.focus();
    else if (pane === 'sessions') sessionPane.focus();
    else previewPane.focus();
    screen.render();
  }

  function openSession(session: Session): void {
    if (demoMode) {
      // In demo mode, show a fake "would open" message instead of spawning claude
      const banner = blessed.box({
        parent: screen,
        label: ' Demo Mode ',
        top: 'center',
        left: 'center',
        width: 52,
        height: 7,
        border: { type: 'line' },
        style: { border: { fg: '#00d4aa' }, label: { fg: '#00d4aa' } },
        tags: true,
        content:
          '\n  {bold}In real use:{/bold} opens this session in\n  Claude Code via `claude --resume <id>`\n\n  {#555555-fg}Press any key to dismiss{/#555555-fg}',
      });
      modalOpen = true;
      banner.focus();
      banner.key(['escape', 'q', 'enter', 'space'], () => {
        banner.destroy();
        modalOpen = false;
        focusPane(activePane);
        screen.render();
      });
      screen.render();
      return;
    }
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
    modalOpen = true;
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
      modalOpen = false;
      if (value && value.trim()) callback(value.trim());
      focusPane(activePane);
    });
    input.on('cancel', () => {
      input.destroy();
      modalOpen = false;
      focusPane(activePane);
    });
  }

  // ── Events: Project pane ──

  // Live filter as you navigate projects (no Enter needed)
  projectPane.on('select item', (_item: unknown, index: number) => {
    const names = getProjectNames();
    const newProject = index === 0 ? null : names[index - 1] || null;
    if (newProject !== activeProjectName) {
      activeProjectName = newProject;
      refreshSessionPane();
      updateStatusBar();
      screen.render();
    }
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
    if (modalOpen) return; // don't quit while a popup is open
    screen.destroy();
    process.exit(0);
  });

  // Tab / Right arrow to cycle forward
  screen.key(['tab', 'right', 'l'], () => {
    const order: Pane[] = ['projects', 'sessions', 'preview'];
    const next = order[(order.indexOf(activePane) + 1) % 3];
    focusPane(next);
  });

  // Shift+Tab / Left arrow to cycle backward
  screen.key(['S-tab', 'left', 'h'], () => {
    const order: Pane[] = ['projects', 'sessions', 'preview'];
    const prev = order[(order.indexOf(activePane) + 2) % 3];
    focusPane(prev);
  });

  // Search on `/` (no shift). Shift+/ = ? handled separately for help.
  screen.on('keypress', (_ch: string, key: { full: string; shift: boolean }) => {
    if (!key) return;
    if (key.full === '/' && !key.shift) {
      showInput('Search', (value) => {
        searchQuery = value;
        refreshSessionPane();
        updateStatusBar();
        screen.render();
      });
    }
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

  // Tag (t) and Untag (Shift+t = T) — differentiated via keypress event
  screen.on('keypress', (ch: string, key: { full: string; shift: boolean }) => {
    if (!key || modalOpen) return;

    // Lowercase 't' = Add tags
    if (key.full === 't' && !key.shift) {
      const session = filteredSessions[sessionIndex];
      if (!session) return;
      showInput('Add tags (comma-separated)', (value) => {
        const tags = value.split(',').map((tg) => tg.trim()).filter(Boolean);
        addTags(session.id, tags);
        session.tags = [...new Set([...session.tags, ...tags])];
        refreshPreview();
        screen.render();
      });
      return;
    }

    // Uppercase 'T' (Shift+t) = Remove tag
    if (key.full === 'S-t' || (key.full === 't' && key.shift) || ch === 'T') {
      const session = filteredSessions[sessionIndex];
      if (!session || session.tags.length === 0) return;
      modalOpen = true;

      const tagsSnapshot = [...session.tags];

      const popup = blessed.list({
        parent: screen,
        label: ' Remove tag ',
        top: 'center',
        left: 'center',
        width: 40,
        height: Math.min(tagsSnapshot.length + 4, 15),
        border: { type: 'line' },
        style: {
          border: { fg: '#00d4aa' },
          selected: { bg: '#1a3a4a', fg: 'white' },
          item: { fg: '#cccccc' },
          label: { fg: '#00d4aa' },
        },
        keys: true,
        vi: true,
        items: tagsSnapshot,
      });
      popup.focus();
      screen.render();

      popup.on('select', (_item: unknown, index: number) => {
        const tag = tagsSnapshot[index];
        removeTags(session.id, [tag]);
        session.tags = session.tags.filter((tg) => tg !== tag);
        popup.destroy();
        modalOpen = false;
        refreshPreview();
        focusPane(activePane);
        screen.render();
      });
      popup.key(['escape', 'q'], () => {
        popup.destroy();
        modalOpen = false;
        focusPane(activePane);
        screen.render();
      });
    }
  });

  // Add to project
  screen.key('a', () => {
    if (modalOpen) return;
    const session = filteredSessions[sessionIndex];
    if (!session) return;
    modalOpen = true;

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
      modalOpen = false;
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
      modalOpen = false;
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
  screen.key(['?', 'S-/'], () => {
    if (modalOpen) return;
    modalOpen = true;
    const help = blessed.box({
      parent: screen,
      label: ' Keyboard Shortcuts ',
      top: 'center',
      left: 'center',
      width: 62,
      height: 24,
      border: { type: 'line' },
      style: { border: { fg: '#00d4aa' }, label: { fg: '#00d4aa' } },
      tags: true,
      content: [
        '',
        '  {#00d4aa-fg}NAVIGATE{/#00d4aa-fg}',
        '  Left / Right       Switch pane',
        '  Tab / Shift+Tab    Switch pane (alt)',
        '  Up / Down          Move in list',
        '  Enter              Select / open session',
        '',
        '  {#00d4aa-fg}SEARCH & SORT{/#00d4aa-fg}',
        '  /                  Search sessions',
        '  Esc                Clear search',
        '  s                  Cycle sort',
        '',
        '  {#00d4aa-fg}ORGANIZE{/#00d4aa-fg}',
        '  t                  Add tags',
        '  T (Shift+t)        Remove a tag',
        '  a                  Add session to project',
        '  n                  Create new project',
        '  r                  Remove from project',
        '',
        '  {#00d4aa-fg}q{/#00d4aa-fg} quit    {#00d4aa-fg}?{/#00d4aa-fg} this help',
        '',
        '  {#555555-fg}Esc / q / Enter to close this{/#555555-fg}',
      ].join('\n'),
    });
    help.focus();
    help.key(['escape', 'q', '?', 'enter', 'space'], () => {
      help.destroy();
      modalOpen = false;
      focusPane(activePane);
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
