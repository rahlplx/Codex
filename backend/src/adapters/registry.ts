import type { ICliAdapter } from '../types/adapter.js'

export class AdapterRegistry {
  private readonly adapters = new Map<string, ICliAdapter>()

  register(adapter: ICliAdapter): void {
    this.adapters.set(adapter.id, adapter)
  }

  unregister(id: string): void {
    this.adapters.delete(id)
  }

  resolve(id: string): ICliAdapter | undefined {
    return this.adapters.get(id)
  }

  list(): ICliAdapter[] {
    return [...this.adapters.values()]
  }
}
