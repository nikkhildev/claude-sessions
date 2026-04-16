import chalk from 'chalk';
import { loadAllSessions } from '../core/sessionReader.js';
import { resolveSession } from '../core/sessionResolver.js';
import { addTags, removeTags } from '../core/metadataStore.js';

export async function tagCommand(
  query: string,
  tags: string[],
  opts: { remove?: boolean },
): Promise<void> {
  const sessions = loadAllSessions();
  const session = resolveSession(query, sessions);

  if (!session) {
    console.log(chalk.red(`Session not found: ${query}`));
    return;
  }

  if (tags.length === 0) {
    if (session.tags.length === 0) {
      console.log(
        chalk.gray(`Session ${session.id.slice(0, 8)} has no tags`),
      );
    } else {
      console.log(
        chalk.bold(`Tags for ${session.id.slice(0, 8)}:`),
        chalk.cyan(session.tags.join(', ')),
      );
    }
    return;
  }

  if (opts.remove) {
    removeTags(session.id, tags);
    console.log(
      chalk.green(
        `Removed tags from ${session.id.slice(0, 8)}: ${tags.join(', ')}`,
      ),
    );
  } else {
    addTags(session.id, tags);
    console.log(
      chalk.green(
        `Tagged ${session.id.slice(0, 8)} with: ${tags.join(', ')}`,
      ),
    );
  }
}
