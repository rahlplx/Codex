export interface AppConfig {
  port: number
  databasePath: string
  providers: Record<string, ProviderConfig>
}

export interface ProviderConfig {
  enabled: boolean
  apiKey?: string
  baseUrl?: string
  timeout?: number
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3001),
    databasePath: process.env['DATABASE_PATH'] ?? './data/codex.db',
    providers: {
      'opencode-zen': { enabled: process.env['OPENCODE_ZEN_ENABLED'] !== 'false' },
      'nemotron': { enabled: process.env['NEMOTRON_ENABLED'] !== 'false' },
      'openrouter-free': { enabled: process.env['OPENROUTER_FREE_ENABLED'] !== 'false', apiKey: process.env['OPENROUTER_API_KEY'] },
    },
  }
}
