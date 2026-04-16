import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AppConfig } from '../core/types.js';

function getConfigDir(): string {
  return process.env.CLAUDE_SESSIONS_DATA_DIR || join(homedir(), '.claude-sessions');
}

const DEFAULT_CONFIG: AppConfig = {
  defaultProject: null,
  defaultLimit: 20,
  defaultSort: 'date',
  claudePath: 'claude',
  previewMessages: 10,
};

export function loadConfig(): AppConfig {
  try {
    const configFile = join(getConfigDir(), 'config.json');
    if (existsSync(configFile)) {
      const raw = readFileSync(configFile, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(config: AppConfig): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'config.json'), JSON.stringify(config, null, 2) + '\n');
}
