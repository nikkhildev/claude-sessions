import blessed from 'blessed';
import Fuse from 'fuse.js';
import { spawn } from 'node:child_process';
import type { Session } from '../core/types.js';
import {
  loadAllSessions,
  findProjectDir,
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

  const baseSessions = loadAllSessions(projectDirs)
    .filter((s) => !s.archived)
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());

  let activeProjectName: string | null = opts.projectName || null;
  let allSessions = applyProjectFilter(baseSessions, activeProjectName);
  let filteredSessions = [...allSessions];
  let sortMode: 'date' | 'messages' | 'branch' = 'date';
  let searchQuery = '';
  let selectedIndex = 0;

  function applyProjectFilter(
    sessions: Session[],
    projectName: string | null,
  ): Session[] {
    if (!projectName) return sessions;
    const ids = new Set(getProjectSessionIds(projectName));
    return sessions.filter((s) => ids.has(s.id));
  }

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

  let fuse = new Fuse(allSessions, {
    keys: ['summary', 'firstPrompt', 'branch', 'name', 'tags'],
    threshold: 0.4,
    ignoreLocation: true,
  });

  function updateStatusBar(): void {
    const projectLabel = activeProjectName
      ? `{cyan-fg}[${activeProjectName}]{/cyan-fg}  `
      : '';
    statusBar.setContent(
      ` ${projectLabel}{bold}↑↓{/bold} Nav  {bold}Enter{/bold} Open  {bold}/{/bold} Search  {bold}t{/bold} Tag  {bold}T{/bold} Untag  {bold}p{/bold} Projects  {bold}a{/bold} Add to project  {bold}s{/bold} Sort  {bold}?{/bold} Help  {bold}q{/bold} Quit  |  ${filteredSessions.length}/${baseSessions.length}`,
    );
  }

  function refreshList(): void {
    allSessions = applyProjectFilter(baseSessions, activeProjectName);
    fuse = new Fuse(allSessions, {
      keys: ['summary', 'firstPrompt', 'branch', 'name', 'tags'],
      threshold: 0.4,
      ignoreLocation: true,
    });

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
      selectedIndex = 0;
      updatePreview(preview, filteredSessions[0]);
    } else {
      preview.setContent('No sessions match your filters');
    }

    updateStatusBar();
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

  // --- Helper: show a popup input box ---
  function showInput(
    label: string,
    callback: (value: string) => void,
  ): void {
    const input = blessed.textbox({
      parent: screen,
      label: ` ${label} `,
      top: 'center',
      left: 'center',
      width: 55,
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
      input.destroy();
      if (value && value.trim()) callback(value.trim());
      sessionList.focus();
      screen.render();
    });
    input.on('cancel', () => {
      input.destroy();
      sessionList.focus();
      screen.render();
    });
  }

  // --- Helper: show a selectable list popup ---
  function showListPopup(
    label: string,
    items: string[],
    callback: (selected: string, index: number) => void,
  ): void {
    const popup = blessed.list({
      parent: screen,
      label: ` ${label} `,
      top: 'center',
      left: 'center',
      width: 55,
      height: Math.min(items.length + 4, 20),
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' },
        label: { fg: 'white', bold: true },
      },
      keys: true,
      vi: true,
      mouse: true,
      items: items,
    });
    popup.focus();
    screen.render();

    popup.on('select', (_item: unknown, index: number) => {
      popup.destroy();
      callback(items[index], index);
      sessionList.focus();
      screen.render();
    });
    popup.key(['escape', 'q'], () => {
      popup.destroy();
      sessionList.focus();
      screen.render();
    });
  }

  // --- Update preview on selection change ---
  sessionList.on('select item', (_item: unknown, index: number) => {
    selectedIndex = index;
    if (filteredSessions[index]) {
      updatePreview(preview, filteredSessions[index]);
      screen.render();
    }
  });

  // === KEY BINDINGS ===

  // Quit
  screen.key(['q', 'C-c'], () => {
    screen.destroy();
    process.exit(0);
  });

  // Search
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

  // Sort toggle
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

  // Tag session
  screen.key('t', () => {
    const session = filteredSessions[selectedIndex];
    if (!session) return;
    const existing =
      session.tags.length > 0
        ? ` (current: ${session.tags.join(', ')})`
        : '';
    showInput(`Add tags, comma-separated${existing}`, (value) => {
      const tags = value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      addTags(session.id, tags);
      session.tags = [...new Set([...session.tags, ...tags])];
      updateListItems(sessionList, filteredSessions);
      updatePreview(preview, session);
    });
  });

  // Untag session
  screen.key('T', () => {
    const session = filteredSessions[selectedIndex];
    if (!session || session.tags.length === 0) return;

    showListPopup(
      `Remove tag from ${session.id.slice(0, 8)}`,
      session.tags,
      (selected) => {
        removeTags(session.id, [selected]);
        session.tags = session.tags.filter((t) => t !== selected);
        updateListItems(sessionList, filteredSessions);
        updatePreview(preview, session);
      },
    );
  });

  // Project menu
  screen.key('p', () => {
    const projects = listProjects();
    const projectNames = Object.keys(projects);
    const menuItems = [
      '{green-fg}+ New Project{/green-fg}',
      '{yellow-fg}All Sessions (clear filter){/yellow-fg}',
      ...projectNames.map(
        (name) =>
          `${name} (${projects[name].sessions.length} sessions)`,
      ),
    ];

    const popup = blessed.list({
      parent: screen,
      label: ' Projects — Select to filter ',
      top: 'center',
      left: 'center',
      width: 55,
      height: Math.min(menuItems.length + 4, 20),
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' },
        label: { fg: 'cyan', bold: true },
      },
      keys: true,
      vi: true,
      mouse: true,
      items: menuItems,
      tags: true,
    });
    popup.focus();
    screen.render();

    popup.on('select', (_item: unknown, index: number) => {
      popup.destroy();

      if (index === 0) {
        // New Project
        showInput('Project name', (name) => {
          try {
            createProject(name);
            activeProjectName = name;
            refreshList();
          } catch {
            // Project already exists — just switch to it
            activeProjectName = name;
            refreshList();
          }
        });
      } else if (index === 1) {
        // Clear filter
        activeProjectName = null;
        refreshList();
        sessionList.focus();
      } else {
        // Switch to selected project
        activeProjectName = projectNames[index - 2];
        refreshList();
        sessionList.focus();
      }
      screen.render();
    });

    popup.key(['escape', 'q'], () => {
      popup.destroy();
      sessionList.focus();
      screen.render();
    });
  });

  // Add current session to a project
  screen.key('a', () => {
    const session = filteredSessions[selectedIndex];
    if (!session) return;

    const projects = listProjects();
    const projectNames = Object.keys(projects);

    if (projectNames.length === 0) {
      // No projects yet — offer to create one
      showInput('No projects yet. Create one (enter name)', (name) => {
        try {
          createProject(name);
        } catch {
          // Already exists
        }
        addSessionsToProject(name, [session.id]);
        updateStatusBar();
        screen.render();
      });
      return;
    }

    // Show which projects this session is already in
    const items = projectNames.map((name) => {
      const isIn = projects[name].sessions.includes(session.id);
      return isIn
        ? `${name} {green-fg}(already added){/green-fg}`
        : name;
    });
    items.push('{green-fg}+ New Project{/green-fg}');

    const popup = blessed.list({
      parent: screen,
      label: ` Add "${session.id.slice(0, 8)}" to project `,
      top: 'center',
      left: 'center',
      width: 55,
      height: Math.min(items.length + 4, 20),
      border: { type: 'line' },
      style: {
        border: { fg: 'blue' },
        selected: { bg: 'blue', fg: 'white' },
        item: { fg: 'white' },
        label: { fg: 'cyan', bold: true },
      },
      keys: true,
      vi: true,
      mouse: true,
      items,
      tags: true,
    });
    popup.focus();
    screen.render();

    popup.on('select', (_item: unknown, index: number) => {
      popup.destroy();

      if (index === items.length - 1) {
        // New project
        showInput('New project name', (name) => {
          try {
            createProject(name);
          } catch {
            // Already exists
          }
          addSessionsToProject(name, [session.id]);
        });
      } else {
        // Add to existing project
        const projectName = projectNames[index];
        addSessionsToProject(projectName, [session.id]);
      }

      sessionList.focus();
      screen.render();
    });

    popup.key(['escape', 'q'], () => {
      popup.destroy();
      sessionList.focus();
      screen.render();
    });
  });

  // Remove current session from active project
  screen.key('r', () => {
    const session = filteredSessions[selectedIndex];
    if (!session || !activeProjectName) return;

    removeSessionsFromProject(activeProjectName, [session.id]);
    // Refresh to remove it from the filtered view
    refreshList();
  });

  // Help
  screen.key('?', () => {
    const help = blessed.box({
      parent: screen,
      label: ' Help ',
      top: 'center',
      left: 'center',
      width: 58,
      height: 22,
      border: { type: 'line' },
      style: { border: { fg: 'blue' } },
      tags: true,
      content: [
        '',
        '  {bold}{underline}Navigation{/underline}{/bold}',
        '  {bold}↑/↓ or j/k{/bold}   Navigate sessions',
        '  {bold}Enter{/bold}         Open session in Claude Code',
        '  {bold}/{/bold}             Search sessions',
        '  {bold}s{/bold}             Toggle sort (date/msgs/branch)',
        '',
        '  {bold}{underline}Tags{/underline}{/bold}',
        '  {bold}t{/bold}             Add tags to selected session',
        '  {bold}T{/bold} (shift)     Remove a tag from selected session',
        '',
        '  {bold}{underline}Projects{/underline}{/bold}',
        '  {bold}p{/bold}             Project menu (create/switch/clear)',
        '  {bold}a{/bold}             Add selected session to a project',
        '  {bold}r{/bold}             Remove session from active project',
        '',
        '  {bold}{underline}General{/underline}{/bold}',
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
  updateStatusBar();
  sessionList.focus();
  screen.render();
}
