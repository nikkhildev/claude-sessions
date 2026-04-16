import blessed from 'blessed';

export function createSearchBar(
  parent: blessed.Widgets.Screen,
): blessed.Widgets.TextboxElement {
  return blessed.textbox({
    parent,
    label: ' / Search ',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: {
      border: { fg: '#444444' },
      label: { fg: '#00d4aa' },
      focus: { border: { fg: '#00d4aa' } },
      fg: 'white',
    },
    inputOnFocus: true,
  });
}

export function createStatusBar(
  parent: blessed.Widgets.Screen,
  totalSessions: number,
): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: {
      border: { fg: '#444444' },
      fg: '#888888',
    },
    tags: true,
    content: ` {#00d4aa-fg}?{/#00d4aa-fg} help  |  ${totalSessions} sessions`,
  });
}
