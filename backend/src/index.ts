import { createApp } from './server/httpServer.js'
import { loadConfig } from './types/config.js'
import { AdapterRegistry } from './adapters/registry.js'
import { OpenCodeZenAdapter } from './adapters/opencode-zen.js'
import { NemotronAdapter } from './adapters/nemotron.js'
import { OpenRouterFreeAdapter } from './adapters/openrouter-free.js'
import { AntigravityAdapter } from './adapters/antigravity.js'
import { KiloCodeAdapter } from './adapters/kilocode.js'
import { NineRouterAdapter } from './adapters/nine-router.js'
import { CliRelayAdapter } from './adapters/cli-relay.js'
import { CliProxyApiAdapter } from './adapters/cli-proxy-api.js'
import { AiClient2ApiAdapter } from './adapters/ai-client2api.js'
import { openDatabase } from './storage/database.js'
import { ModelDiscoveryScanner } from './discovery/scanner.js'
import { createTelegramBridge } from './integrations/telegram.js'

const config = loadConfig()

const registry = new AdapterRegistry()

// Instantiate adapters before initializing so all are available to Promise.all
const zen = new OpenCodeZenAdapter()
const nemotron = new NemotronAdapter()
const openrouter = new OpenRouterFreeAdapter()
const antigravity = new AntigravityAdapter()
const kilocode = new KiloCodeAdapter()
const nineRouter = new NineRouterAdapter()
const cliRelay = new CliRelayAdapter()
const cliProxyApi = new CliProxyApiAdapter()
const aiClient2Api = new AiClient2ApiAdapter()

// Initialize all adapters in parallel, then register — prevents routing to
// adapters whose config hasn't been applied yet.
const inits = await Promise.allSettled([
  zen.initialize({ baseUrl: config.zenBaseUrl, apiKey: config.zenApiKey }),
  nemotron.initialize({}),
  openrouter.initialize({ apiKey: config.providers['openrouter-free']?.apiKey }),
  antigravity.initialize({ apiKey: config.providers['antigravity']?.apiKey }),
  kilocode.initialize({ apiKey: config.providers['kilocode']?.apiKey }),
  nineRouter.initialize({ baseUrl: config.providers['nine-router']?.baseUrl }),
  cliRelay.initialize({ baseUrl: config.providers['cli-relay']?.baseUrl }),
  cliProxyApi.initialize({ baseUrl: config.providers['cli-proxy-api']?.baseUrl }),
  aiClient2Api.initialize({ baseUrl: config.providers['ai-client2api']?.baseUrl }),
])

const adapterNames = ['zen', 'nemotron', 'openrouter', 'antigravity', 'kilocode', 'nine-router', 'cli-relay', 'cli-proxy-api', 'ai-client2api']
inits.forEach((result, i) => {
  if (result.status === 'rejected') {
    console.error(`[${adapterNames[i]}] initialization failed:`, result.reason)
  }
})

registry.register(zen)
registry.register(nemotron)
registry.register(openrouter)
registry.register(antigravity)
registry.register(kilocode)
registry.register(nineRouter)
registry.register(cliRelay)
registry.register(cliProxyApi)
registry.register(aiClient2Api)

const db = openDatabase(config.databasePath)

const scanner = new ModelDiscoveryScanner(registry)
scanner.start()

let telegramBridge: ReturnType<typeof createTelegramBridge> = null
try {
  telegramBridge = createTelegramBridge()
  if (telegramBridge) {
    telegramBridge.start()
    console.log('Telegram bot bridge started')
  }
} catch (e) {
  console.error('[TelegramBridge] Failed to start:', e)
}

const app = createApp(registry, db)

const server = app.listen(config.port, () => {
  console.log(`Codex backend listening on :${config.port}`)
  console.log(`Registered adapters: ${registry.list().map((a: { id: string }) => a.id).join(', ')}`)
})

function shutdown() {
  console.log('Shutting down gracefully...')
  const forceExit = setTimeout(() => {
    console.error('[shutdown] Force exiting after 10s — likely open SSE connections')
    process.exit(1)
  }, 10_000)
  forceExit.unref()
  server.close(() => {
    scanner.stop()
    telegramBridge?.stop()
    db.close()
    process.exit(0)
  })
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
