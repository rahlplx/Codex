import express from 'express'
import { AdapterRegistry } from '../adapters/registry'
import { healthRouter } from './routes/health'
import { createProvidersRouter } from './routes/providers'
import { createModelsRouter } from './routes/models'
import { createChatRouter } from './routes/chat'

export function createApp(registry?: AdapterRegistry): express.Application {
  const reg = registry ?? new AdapterRegistry()
  const app = express()

  app.use(express.json())

  app.use(healthRouter)
  app.use(createProvidersRouter(reg))
  app.use(createModelsRouter(reg))
  app.use(createChatRouter(reg))

  return app
}
