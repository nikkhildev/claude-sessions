import { spawn } from 'node:child_process';
import chalk from 'chalk';
import { loadAllSessions } from '../core/sessionReader.js';
import { resolveSession } from '../core/sessionResolver.js';
import { loadConfig } from '../utils/config.js';

export async function openCommand(query: string): Promise<void> {
  const sessions = loadAllSessions();
  const session = resolveSession(query, sessions);

  if (!session) {
    console.log(chalk.red(`Session not found: ${query}`));
    console.log(chalk.gray('Use "claude-sessions list" to see available sessions'));
    return;
  }

  const config = loadConfig();
  const claudePath = config.claudePath;

  console.log(
    chalk.green(
      `Opening session: ${session.summary || session.firstPrompt}`,
    ),
  );
  console.log(chalk.gray(`ID: ${session.id}`));
  console.log('');

  const child = spawn(claudePath, ['--resume', session.id], {
    stdio: 'inherit',
    cwd: session.projectPath || process.cwd(),
  });

  child.on('error', (err) => {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(chalk.red(`Claude Code not found at: ${claudePath}`));
      console.log(
        chalk.gray('Set the path in ~/.claude-sessions/config.json'),
      );
    } else {
      console.log(chalk.red(`Error: ${err.message}`));
    }
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });
}
