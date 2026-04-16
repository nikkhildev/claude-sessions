import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { truncate, formatRelativeDate } from '../utils/format.js';
import { cleanSessionTitle } from '../utils/format.js';

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
      ch: '▐',
      track: { bg: '#222222' },
      style: { bg: '#00d4aa' },
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
    const title = cleanSessionTitle(s);
    const relDate = formatRelativeDate(s.modified);
    const branch = truncate(s.branch, 20);
    const msgs = s.messageCount;
    const tags =
      s.tags.length > 0
        ? `  {#00d4aa-fg}${s.tags.map((t) => `#${t}`).join(' ')}{/#00d4aa-fg}`
        : '';

    const num = String(i + 1).padStart(2);

    return ` {#666666-fg}${num}{/#666666-fg}  {bold}${truncate(title, 32)}{/bold}${tags}\n     {#5588cc-fg}⎇ ${branch}{/#5588cc-fg}  {#666666-fg}💬 ${msgs}  ⏱ ${relDate}{/#666666-fg}`;
  });
  list.setItems(items);
  list.setLabel(` {bold}Sessions{/bold} (${sessions.length}) `);
}
