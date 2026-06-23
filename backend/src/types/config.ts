export interface AppConfig {
  port: number
  databasePath: string
  zenBaseUrl?: string | undefined
  zenApiKey?: string | undefined
  providers: Record<string, ProviderConfig>
}

export interface ProviderConfig {
  enabled: boolean
  apiKey?: string | undefined
  baseUrl?: string | undefined
  timeout?: number | undefined
}

export function loadConfig(): AppConfig {
  return {
    port: Number(process.env['PORT'] ?? 3001),
    databasePath: process.env['DATABASE_PATH'] ?? './data/codex.db',
    zenBaseUrl: process.env['OPENCODE_ZEN_BASE_URL'],
    zenApiKey: process.env['OPENCODE_ZEN_API_KEY'],
    providers: {
      'opencode-zen': { enabled: process.env['OPENCODE_ZEN_ENABLED'] !== 'false' },
      'nemotron': { enabled: process.env['NEMOTRON_ENABLED'] !== 'false' },
      'openrouter-free': { enabled: process.env['OPENROUTER_FREE_ENABLED'] !== 'false', apiKey: process.env['OPENROUTER_API_KEY'] },
      'antigravity': { enabled: process.env['ANTIGRAVITY_ENABLED'] !== 'false', apiKey: process.env['GOOGLE_AI_API_KEY'] },
      'kilocode': { enabled: process.env['KILOCODE_ENABLED'] !== 'false', apiKey: process.env['KILOCODE_API_KEY'] },
    },
  }
}
