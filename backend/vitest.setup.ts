// Sets the JWT_SECRET env var before any test module is imported, so jwt.ts
// doesn't throw at load time in unit tests.
process.env['JWT_SECRET'] = 'test-secret-codex-vitest-only'
