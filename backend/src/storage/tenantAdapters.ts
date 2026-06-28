import crypto from 'node:crypto'
import type { Database } from 'better-sqlite3'

export interface TenantAdapterRow {
  id: string
  tenantId: string
  name: string
  baseUrl: string
  apiKey: string | undefined
  label: string | undefined
  isActive: boolean
  createdAt: string
}

interface RawRow {
  id: string
  tenant_id: string
  key_encrypted: Buffer
  key_label: string | null
  is_active: number
  created_at: string
  endpoint_url: string | null
}

function toRow(raw: RawRow): TenantAdapterRow {
  const apiKeyStr = raw.key_encrypted.toString()
  return {
    id: raw.id,
    tenantId: raw.tenant_id,
    name: raw.key_label ?? 'Personal Adapter',
    baseUrl: raw.endpoint_url ?? '',
    apiKey: apiKeyStr || undefined,
    label: raw.key_label ?? undefined,
    isActive: raw.is_active === 1,
    createdAt: raw.created_at,
  }
}

export class TenantAdapterRepository {
  private readonly stmtList
  private readonly stmtInsert
  private readonly stmtDelete
  private readonly stmtFind
  private readonly stmtPatch

  constructor(db: Database) {
    this.stmtList = db.prepare(
      `SELECT * FROM tenant_keys WHERE tenant_id = ? AND provider = 'user-proxy' ORDER BY created_at ASC`
    )
    this.stmtInsert = db.prepare(
      `INSERT INTO tenant_keys (id, tenant_id, provider, key_encrypted, key_label, is_active, endpoint_url)
       VALUES (?, ?, 'user-proxy', ?, ?, 1, ?)`
    )
    this.stmtDelete = db.prepare(
      `DELETE FROM tenant_keys WHERE id = ? AND tenant_id = ? AND provider = 'user-proxy'`
    )
    this.stmtFind = db.prepare(
      `SELECT * FROM tenant_keys WHERE id = ? AND tenant_id = ? AND provider = 'user-proxy'`
    )
    this.stmtPatch = db.prepare(
      `UPDATE tenant_keys
       SET key_label = COALESCE(?, key_label), is_active = COALESCE(?, is_active)
       WHERE id = ? AND tenant_id = ? AND provider = 'user-proxy'`
    )
  }

  listActive(tenantId: string): TenantAdapterRow[] {
    return (this.stmtList.all(tenantId) as RawRow[])
      .filter(r => r.is_active === 1)
      .map(toRow)
  }

  list(tenantId: string): TenantAdapterRow[] {
    return (this.stmtList.all(tenantId) as RawRow[]).map(toRow)
  }

  insert(row: { tenantId: string; name: string; baseUrl: string; apiKey?: string; label?: string }): TenantAdapterRow {
    const id = crypto.randomUUID()
    const label = row.label ?? row.name
    const keyBuf = Buffer.from(row.apiKey ?? '')
    this.stmtInsert.run(id, row.tenantId, keyBuf, label, row.baseUrl)
    return this.findById(id, row.tenantId)!
  }

  delete(id: string, tenantId: string): boolean {
    const result = this.stmtDelete.run(id, tenantId)
    return result.changes > 0
  }

  findById(id: string, tenantId: string): TenantAdapterRow | null {
    const raw = this.stmtFind.get(id, tenantId) as RawRow | undefined
    return raw ? toRow(raw) : null
  }

  patch(id: string, tenantId: string, updates: { label?: string; isActive?: boolean }): TenantAdapterRow | null {
    this.stmtPatch.run(
      updates.label ?? null,
      updates.isActive !== undefined ? (updates.isActive ? 1 : 0) : null,
      id,
      tenantId
    )
    return this.findById(id, tenantId)
  }
}
