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
    label: ` Sessions (${sessions.length}) `,
    top: 3,
    left: 0,
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'gray' },
      selected: { bg: 'blue', fg: 'white' },
      item: { fg: 'white' },
      label: { fg: 'white', bold: true },
    },
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: { bg: 'gray' },
      style: { bg: 'blue' },
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
  const items = sessions.map((s) => {
    const name = s.name || s.summary || truncate(s.firstPrompt, 35);
    const date = formatShortDate(s.modified);
    const branch = truncate(s.branch, 20);
    const tags = s.tags.length > 0 ? ` [${s.tags.join(',')}]` : '';
    return ` ${truncate(name, 30)}  ${branch}  ${s.messageCount}msgs  ${date}${tags}`;
  });
  list.setItems(items);
  list.setLabel(` Sessions (${sessions.length}) `);
}
