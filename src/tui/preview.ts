import blessed from 'blessed';
import type { Session } from '../core/types.js';
import { readSessionMessages } from '../core/sessionReader.js';
import {
  formatDate,
  truncate,
  stripSystemTags,
  cleanSessionTitle,
} from '../utils/format.js';

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
      border: { fg: '#444444' },
      label: { fg: '#00d4aa', bold: true },
    },
    scrollable: true,
    alwaysScroll: true,
    scrollbar: {
      ch: '▐',
      track: { bg: '#222222' },
      style: { bg: '#00d4aa' },
    },
    mouse: true,
    keys: true,
    vi: true,
    tags: true,
    content: '\n  {#666666-fg}← Select a session to preview{/#666666-fg}',
  });
}

export function updatePreview(
  box: blessed.Widgets.BoxElement,
  session: Session,
): void {
  const messages = readSessionMessages(session.jsonlPath, 20);
  const title = cleanSessionTitle(session);

  let content = '';

  // ── Header ──
  content += `\n  {bold}{white-fg}${title}{/white-fg}{/bold}\n\n`;
  content += `  {#00d4aa-fg}⎇{/#00d4aa-fg}  {#5588cc-fg}${session.branch}{/#5588cc-fg}\n`;
  content += `  {#00d4aa-fg}📅{/#00d4aa-fg} {#888888-fg}${formatDate(session.created.toISOString())}{/#888888-fg}\n`;
  content += `  {#00d4aa-fg}💬{/#00d4aa-fg} {white-fg}${session.messageCount} messages{/white-fg}\n`;
  content += `  {#00d4aa-fg}🔑{/#00d4aa-fg} {#555555-fg}${session.id.slice(0, 8)}...{/#555555-fg}\n`;

  if (session.tags.length > 0) {
    const tagStr = session.tags
      .map((t) => `{#00d4aa-fg}#${t}{/#00d4aa-fg}`)
      .join('  ');
    content += `  {#00d4aa-fg}🏷{/#00d4aa-fg}  ${tagStr}\n`;
  }

  // ── Divider ──
  content +=
    '\n  {#333333-fg}─────────────────────────────────────────{/#333333-fg}\n';

  // ── Messages ──
  if (messages.length === 0) {
    content +=
      '\n  {#666666-fg}No messages found in session file{/#666666-fg}\n';
  } else {
    for (const msg of messages) {
      const isUser = msg.type === 'user';
      const icon = isUser ? '▸' : '◂';
      const roleColor = isUser ? '#4ec9b0' : '#569cd6';
      const roleLabel = isUser ? 'You' : 'Claude';

      const text = stripSystemTags(msg.content);
      if (!text) continue;

      const display = truncate(text, 350);
      content += `\n  {${roleColor}-fg}{bold}${icon} ${roleLabel}{/bold}{/${roleColor}-fg}\n`;

      // Indent message text
      const lines = display.split('\n');
      for (const line of lines) {
        content += `  {#bbbbbb-fg}${line}{/#bbbbbb-fg}\n`;
      }
    }
  }

  box.setContent(content);
  box.setLabel(` {bold}Preview{/bold} — ${truncate(title, 28)} `);
  box.scrollTo(0);
}
