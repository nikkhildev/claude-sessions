import blessed from 'blessed';

export function createSearchBar(
  parent: blessed.Widgets.Screen,
): blessed.Widgets.TextboxElement {
  return blessed.textbox({
    parent,
    label: ' Search ',
    top: 0,
    left: 0,
    width: '100%',
    height: 3,
    border: { type: 'line' },
    style: {
      border: { fg: 'gray' },
      label: { fg: 'white', bold: true },
      focus: { border: { fg: 'blue' } },
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
      border: { fg: 'gray' },
    },
    tags: true,
    content: ` {bold}↑↓{/bold} Navigate  {bold}Enter{/bold} Open  {bold}/{/bold} Search  {bold}t{/bold} Tag  {bold}s{/bold} Sort  {bold}?{/bold} Help  {bold}q{/bold} Quit  |  ${totalSessions} sessions`,
  });
}
