import express from 'express'
import { AdapterRegistry } from '../adapters/registry'
import { healthRouter } from './routes/health'
import { createProvidersRouter } from './routes/providers'
import { createModelsRouter } from './routes/models'

export function createApp(registry?: AdapterRegistry): express.Application {
  const reg = registry ?? new AdapterRegistry()
  const app = express()

  app.use(express.json())

  app.use(healthRouter)
  app.use(createProvidersRouter(reg))
  app.use(createModelsRouter(reg))

  return app
}
