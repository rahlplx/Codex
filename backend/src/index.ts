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

const config = loadConfig()

const registry = new AdapterRegistry()

const zen = new OpenCodeZenAdapter()
zen.initialize({ baseUrl: config.zenBaseUrl, apiKey: config.zenApiKey }).catch(console.error)
registry.register(zen)

const nemotron = new NemotronAdapter()
nemotron.initialize({}).catch(console.error)
registry.register(nemotron)

const openrouter = new OpenRouterFreeAdapter()
openrouter.initialize({ apiKey: config.providers['openrouter-free']?.apiKey }).catch(console.error)
registry.register(openrouter)

const antigravity = new AntigravityAdapter()
antigravity.initialize({ apiKey: config.providers['antigravity']?.apiKey }).catch(console.error)
registry.register(antigravity)

const kilocode = new KiloCodeAdapter()
kilocode.initialize({ apiKey: config.providers['kilocode']?.apiKey }).catch(console.error)
registry.register(kilocode)

const nineRouter = new NineRouterAdapter()
nineRouter.initialize({ baseUrl: config.providers['nine-router']?.baseUrl }).catch(console.error)
registry.register(nineRouter)

const cliRelay = new CliRelayAdapter()
cliRelay.initialize({ baseUrl: config.providers['cli-relay']?.baseUrl }).catch(console.error)
registry.register(cliRelay)

const cliProxyApi = new CliProxyApiAdapter()
cliProxyApi.initialize({ baseUrl: config.providers['cli-proxy-api']?.baseUrl }).catch(console.error)
registry.register(cliProxyApi)

const aiClient2Api = new AiClient2ApiAdapter()
aiClient2Api.initialize({ baseUrl: config.providers['ai-client2api']?.baseUrl }).catch(console.error)
registry.register(aiClient2Api)

const db = openDatabase(config.databasePath)

const scanner = new ModelDiscoveryScanner(registry)
scanner.start()

const app = createApp(registry, db)

app.listen(config.port, () => {
  console.log(`Codex backend listening on :${config.port}`)
  console.log(`Registered adapters: ${registry.list().map((a: { id: string }) => a.id).join(', ')}`)
})
