import { launchTui } from '../tui/app.js';

export async function browseCommand(opts: {
  project?: string;
  projectName?: string;
  all?: boolean;
  demo?: boolean;
}): Promise<void> {
  launchTui(opts);
}
