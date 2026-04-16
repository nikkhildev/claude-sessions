import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { truncate, formatRelativeDate, cleanSessionTitle } from '../utils/format.js';

export function createSessionList(
  parent: blessed.Widgets.Screen,
  sessions: Session[],
  onSelect: (session: Session) => void,
): blessed.Widgets.ListElement {
  const list = blessed.list({
    parent,
    label: ' Sessions (' + sessions.length + ') ',
    top: 3,
    left: 0,
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
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
    scrollbar: {
      ch: ' ',
      track: { bg: '#222222' },
      style: { bg: '#00d4aa' },
    },
    items: [],
  });

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
    const title = cleanSessionTitle(s);
    const num = String(i + 1).padStart(3);
    return `${num}  ${truncate(title, 50)}`;
  });
  list.setItems(items);
  list.setLabel(' Sessions (' + sessions.length + ') ');
}
