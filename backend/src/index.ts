import { createApp } from './server/httpServer'
import { loadConfig } from './types/config'
import { AdapterRegistry } from './adapters/registry'
import { OpenCodeZenAdapter } from './adapters/opencode-zen'
import { NemotronAdapter } from './adapters/nemotron'
import { OpenRouterFreeAdapter } from './adapters/openrouter-free'
import { openDatabase } from './storage/database'

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

const db = openDatabase(config.databasePath)

const app = createApp(registry, db)

app.listen(config.port, () => {
  console.log(`Codex backend listening on :${config.port}`)
  console.log(`Registered adapters: ${registry.list().map(a => a.id).join(', ')}`)
})
