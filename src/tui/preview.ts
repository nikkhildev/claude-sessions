import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { readSessionMessages } from '../core/sessionReader.js';
import { formatDate, truncate, stripSystemTags } from '../utils/format.js';

export function createPreview(
  parent: blessed.Widgets.Screen,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    label: ' Preview ',
    top: 3,
    right: 0,
    width: '50%',
    bottom: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'gray' },
      label: { fg: 'white', bold: true },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: ' ',
      track: { bg: 'gray' },
      style: { bg: 'blue' },
    },
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    content: 'Select a session to preview',
  });
}

export function updatePreview(
  box: blessed.Widgets.BoxElement,
  session: Session,
): void {
  const messages = readSessionMessages(session.jsonlPath, 15);

  let content = '';
  content += `{bold}${session.summary || truncate(session.firstPrompt, 60)}{/bold}\n`;
  content += `{gray-fg}Branch: ${session.branch}{/gray-fg}\n`;
  content += `{gray-fg}${formatDate(session.created.toISOString())}{/gray-fg}\n`;
  content += `{gray-fg}${session.messageCount} messages{/gray-fg}\n`;
  if (session.tags.length > 0) {
    content += `{cyan-fg}Tags: ${session.tags.join(', ')}{/cyan-fg}\n`;
  }
  content += '\n{gray-fg}─────────────────────────────{/gray-fg}\n\n';

  for (const msg of messages) {
    const role =
      msg.type === 'user'
        ? '{green-fg}[User]{/green-fg}'
        : '{blue-fg}[Assistant]{/blue-fg}';
    const text = stripSystemTags(msg.content);
    const display = truncate(text, 300);
    content += `${role} ${display}\n\n`;
  }

  box.setContent(content);
  box.setLabel(
    ` Preview: ${truncate(session.summary || session.firstPrompt, 30)} `,
  );
}
