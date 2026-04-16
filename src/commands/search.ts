import chalk from 'chalk';
import {
  loadAllSessions,
  findProjectDir,
} from '../core/sessionReader.js';
import { searchSessions } from '../core/sessionSearch.js';
import { formatShortDate, truncate } from '../utils/format.js';
import type { SearchOptions } from '../core/types.js';

export async function searchCommand(
  query: string,
  opts: SearchOptions,
): Promise<void> {
  let projectDirs: string[] | undefined;
  if (!opts.all && opts.project) {
    const dir = findProjectDir(opts.project);
    if (dir) projectDirs = [dir];
  }

  const sessions = loadAllSessions(projectDirs);

  console.log(
    chalk.gray(`Searching ${sessions.length} sessions for "${query}"...`),
  );
  console.log('');

  const results = searchSessions(sessions, query, opts.limit);

  if (results.length === 0) {
    console.log(chalk.yellow(`No sessions found matching "${query}"`));
    return;
  }

  console.log(
    chalk.bold(`Found ${results.length} sessions matching "${query}":`),
  );
  console.log('');

  results.forEach((result, i) => {
    const { session, matches } = result;
    const date = formatShortDate(session.modified);
    const display = session.summary || truncate(session.firstPrompt, 50);
    console.log(
      `  ${chalk.white(`${i + 1}`)}  ${chalk.gray(`[${date}]`)} ${chalk.bold(display)} ${chalk.gray(`(branch: ${session.branch})`)}`,
    );

    for (const match of matches.slice(0, opts.context)) {
      const snippet = truncate(match.content, 80);
      console.log(chalk.gray(`     "${snippet}"`));
    }
    console.log('');
  });
}
