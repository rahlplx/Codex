import { createApp } from './server/httpServer'
import { loadConfig } from './types/config'

const config = loadConfig()
const app = createApp()

app.listen(config.port, () => {
  console.log(`Codex backend listening on :${config.port}`)
})
