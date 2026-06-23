import { createApp } from './server/httpServer'
import { loadConfig } from './types/config'
import { AdapterRegistry } from './adapters/registry'
import { OpenCodeZenAdapter } from './adapters/opencode-zen'

const config = loadConfig()

const registry = new AdapterRegistry()
const zen = new OpenCodeZenAdapter()
zen.initialize({ baseUrl: config.zenBaseUrl, apiKey: config.zenApiKey }).catch(console.error)
registry.register(zen)

const app = createApp(registry)

app.listen(config.port, () => {
  console.log(`Codex backend listening on :${config.port}`)
  console.log(`Registered adapters: ${registry.list().map(a => a.id).join(', ')}`)
})
