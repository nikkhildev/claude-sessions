import chalk from 'chalk';
import {
  loadAllSessions,
  readSessionMessages,
} from '../core/sessionReader.js';
import { resolveSession } from '../core/sessionResolver.js';
import { formatDate, truncate, stripSystemTags } from '../utils/format.js';
import type { ShowOptions } from '../core/types.js';

export async function showCommand(
  query: string,
  opts: ShowOptions,
): Promise<void> {
  const sessions = loadAllSessions();
  const session = resolveSession(query, sessions);

  if (!session) {
    console.log(chalk.red(`Session not found: ${query}`));
    console.log(chalk.gray('Use "claude-sessions list" to see available sessions'));
    return;
  }

  if (opts.json) {
    const messages = readSessionMessages(
      session.jsonlPath,
      opts.full ? undefined : opts.messages,
    );
    console.log(
      JSON.stringify(
        {
          ...session,
          created: session.created.toISOString(),
          modified: session.modified.toISOString(),
          messages,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log('');
  console.log(chalk.bold('Session: ') + chalk.gray(session.id));
  if (session.name) console.log(chalk.bold('Name:    ') + session.name);
  if (session.summary) console.log(chalk.bold('Summary: ') + session.summary);
  console.log(chalk.bold('Branch:  ') + chalk.blue(session.branch));
  console.log(chalk.bold('Project: ') + session.projectPath);
  console.log(
    chalk.bold('Created: ') + formatDate(session.created.toISOString()),
  );
  console.log(
    chalk.bold('Modified:') + ' ' + formatDate(session.modified.toISOString()),
  );
  console.log(chalk.bold('Messages:') + ` ${session.messageCount}`);
  if (session.tags.length > 0) {
    console.log(
      chalk.bold('Tags:    ') + chalk.cyan(session.tags.join(', ')),
    );
  }

  console.log('');
  console.log(chalk.gray('--- Conversation Preview ---'));
  console.log('');

  const limit = opts.full ? undefined : opts.messages;
  const messages = readSessionMessages(session.jsonlPath, limit);

  for (const msg of messages) {
    const role =
      msg.type === 'user' ? chalk.green('[User]') : chalk.blue('[Assistant]');
    const content = stripSystemTags(msg.content);
    const display = opts.full ? content : truncate(content, 200);
    console.log(`${role} ${display}`);
    console.log('');
  }

  if (!opts.full && messages.length >= opts.messages) {
    console.log(
      chalk.gray(
        `... showing first ${opts.messages} messages. Use --full for complete conversation.`,
      ),
    );
  }
}
