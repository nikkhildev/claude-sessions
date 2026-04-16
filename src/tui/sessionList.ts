import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { truncate, formatShortDate } from '../utils/format.js';

export function createSessionList(
  parent: blessed.Widgets.Screen,
  sessions: Session[],
  onSelect: (session: Session) => void,
): blessed.Widgets.ListElement {
  const list = blessed.list({
    parent,
    label: ` {bold}Sessions{/bold} (${sessions.length}) `,
    top: 3,
    left: 0,
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
      selected: { bg: '#1a5276', fg: 'white', bold: true },
      item: { fg: 'white' },
      label: { fg: 'cyan', bold: true },
    },
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '│',
      track: { bg: '#333333' },
      style: { bg: 'cyan' },
    },
    items: [],
    tags: true,
  } as blessed.Widgets.ListOptions<blessed.Widgets.ListElementStyle>);

  updateListItems(list, sessions);

  list.on('select', (_item: unknown, index: number) => {
    if (sessions[index]) {
      onSelect(sessions[index]);
    }
  });

  return list;
}

export function updateListItems(
  list: blessed.Widgets.ListElement,
  sessions: Session[],
): void {
  const items = sessions.map((s, i) => {
    const name = s.name || s.summary || truncate(s.firstPrompt, 30);
    const date = formatShortDate(s.modified);
    const branch = truncate(s.branch, 18);
    const msgs = `${s.messageCount}`;
    const tags =
      s.tags.length > 0 ? ` {cyan-fg}[${s.tags.join(',')}]{/cyan-fg}` : '';

    return ` {gray-fg}${String(i + 1).padStart(2)}.{/gray-fg} {bold}${truncate(name, 28)}{/bold}${tags}\n     {blue-fg}${branch}{/blue-fg}  {gray-fg}${msgs} msgs  ${date}{/gray-fg}`;
  });
  list.setItems(items);
  list.setLabel(` {bold}Sessions{/bold} (${sessions.length}) `);
}
