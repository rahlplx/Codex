export class AssertionError extends Error {
  constructor(msg: string) {
    super(msg)
    this.name = 'AssertionError'
  }
}

export function assertStatus(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new AssertionError(`${label}: expected status ${expected}, got ${actual}`)
}

export function assertDefined(value: unknown, label: string): void {
  if (value === undefined || value === null)
    throw new AssertionError(`${label}: expected defined value, got ${String(value)}`)
}

export function assertString(value: unknown, label: string): asserts value is string {
  if (typeof value !== 'string')
    throw new AssertionError(`${label}: expected string, got ${typeof value}`)
}

export function assertArray(value: unknown, label: string): asserts value is unknown[] {
  if (!Array.isArray(value))
    throw new AssertionError(`${label}: expected array, got ${typeof value}`)
}

export function assertIncludes(text: string, sub: string, label: string): void {
  if (!text.includes(sub))
    throw new AssertionError(`${label}: expected "${sub}" in "${text.slice(0, 120)}"`)
}

export function assertHeaderExists(headers: Headers, name: string, label: string): void {
  if (!headers.get(name)) throw new AssertionError(`${label}: missing header "${name}"`)
}

export function assertShape<T extends object>(value: unknown, keys: (keyof T)[], label: string): asserts value is T {
  if (typeof value !== 'object' || value === null)
    throw new AssertionError(`${label}: expected object, got ${typeof value}`)
  for (const key of keys) {
    if (!(key as string in value))
      throw new AssertionError(`${label}: missing key "${String(key)}"`)
  }
}
