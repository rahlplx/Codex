interface RoutingPrefs {
  autoRouting: boolean
  disabledAdapters: Set<string>
}

const prefs: RoutingPrefs = {
  autoRouting: true,
  disabledAdapters: new Set(),
}

export function getRoutingPrefs(): Readonly<RoutingPrefs> {
  return prefs
}

export function setAutoRouting(enabled: boolean): void {
  prefs.autoRouting = enabled
}

export function setDisabledAdapters(ids: string[]): void {
  prefs.disabledAdapters = new Set(ids)
}
