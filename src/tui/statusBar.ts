import blessed from 'blessed';

export function createSearchBar(
  parent: blessed.Widgets.Screen,
): blessed.Widgets.TextboxElement {
  return blessed.textbox({
    parent,
    label: ' {cyan-fg}{bold}/ Search{/bold}{/cyan-fg} ',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'cyan' },
      label: { fg: 'cyan', bold: true },
      focus: { border: { fg: 'green' } },
    },
    inputOnFocus: true,
    tags: true,
  } as blessed.Widgets.TextboxOptions);
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
      border: { fg: '#555555' },
      fg: 'white',
    },
    tags: true,
    content: ` {cyan-fg}{bold}?{/bold}{/cyan-fg} Help  |  ${totalSessions} sessions`,
  });
}
