export const PROVIDER_IDS = {
  OPENCODE_ZEN: 'opencode-zen',
  OPENROUTER_FREE: 'openrouter-free',
  NEMOTRON: 'nemotron',
  ANTIGRAVITY: 'antigravity',
  KILOCODE: 'kilocode',
  CUSTOM_ENDPOINT: 'custom-endpoint',
} as const;

export type ProviderId = typeof PROVIDER_IDS[keyof typeof PROVIDER_IDS];

export const PROVIDER_TIERS = {
  FREE: 'free',
  FREEMIUM: 'freemium',
  PAID: 'paid',
} as const;

export const PROVIDER_URLS = {
  [PROVIDER_IDS.OPENCODE_ZEN]: 'https://opencode.ai/zen/v1',
  [PROVIDER_IDS.NEMOTRON]: 'https://integrate.api.nvidia.com/v1',
  [PROVIDER_IDS.OPENROUTER_FREE]: 'https://openrouter.ai/api/v1',
} as const;

export const ROUTER_PORTS = {
  NINE_ROUTER: 20128,
  CLI_RELAY: 3456,
  CLI_PROXY_API: 8080,
} as const;
