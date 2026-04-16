import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { readSessionMessages } from '../core/sessionReader.js';
import { formatDate, truncate, stripSystemTags } from '../utils/format.js';

export function createPreview(
  parent: blessed.Widgets.Screen,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    label: ' {bold}Preview{/bold} ',
    top: 3,
    right: 0,
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
      label: { fg: 'cyan', bold: true },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '│',
      track: { bg: '#333333' },
      style: { bg: 'cyan' },
    },
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    content: '{gray-fg}Select a session to preview{/gray-fg}',
  });
}

export function updatePreview(
  box: blessed.Widgets.BoxElement,
  session: Session,
): void {
  const messages = readSessionMessages(session.jsonlPath, 15);

  let content = '';

  // Header
  const title = session.summary || truncate(session.firstPrompt, 55);
  content += `{bold}{white-fg}${title}{/white-fg}{/bold}\n\n`;
  content += `{cyan-fg}Branch:{/cyan-fg}   {blue-fg}${session.branch}{/blue-fg}\n`;
  content += `{cyan-fg}Created:{/cyan-fg}  {gray-fg}${formatDate(session.created.toISOString())}{/gray-fg}\n`;
  content += `{cyan-fg}Messages:{/cyan-fg} {white-fg}${session.messageCount}{/white-fg}\n`;
  content += `{cyan-fg}ID:{/cyan-fg}       {gray-fg}${session.id}{/gray-fg}\n`;
  if (session.tags.length > 0) {
    content += `{cyan-fg}Tags:{/cyan-fg}     {cyan-fg}${session.tags.join(', ')}{/cyan-fg}\n`;
  }

  // Divider
  content += '\n{gray-fg}────────────────────────────────────────{/gray-fg}\n\n';

  // Messages
  for (const msg of messages) {
    const role =
      msg.type === 'user'
        ? '{green-fg}{bold}▶ User{/bold}{/green-fg}'
        : '{blue-fg}{bold}◀ Claude{/bold}{/blue-fg}';
    const text = stripSystemTags(msg.content);
    const display = truncate(text, 300);
    content += `${role}\n{white-fg}${display}{/white-fg}\n\n`;
  }

  box.setContent(content);
  box.setLabel(
    ` {bold}Preview{/bold} — ${truncate(session.summary || session.firstPrompt, 25)} `,
  );
  box.scrollTo(0);
}
