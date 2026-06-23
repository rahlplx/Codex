# Feature: Telemetry Dashboard

**Status:** Planned
**Spec:** [SPEC-002](../specs/SPEC-002-tech-stack.md)
**Branch:** `feature/telemetry-dashboard`

## Summary

A data visualization screen showing model performance rankings by composite score, provider reliability and speed charts, daily usage patterns, and cost savings. All data derived from the `usage_log` table and live health probes. Admin sees aggregate across all tenants; users see only their own usage.

## UI/UX Screens

### Screen 1: Telemetry Overview

**Route:** `/telemetry`
**Component:** `TelemetryDashboard.vue`

```
+---------------------------------------------+
| =  Telemetry               [24h] [7d] [30d] |
+---------------------------------------------+
| Model Rankings (by composite score)          |
| #1 nemotron-3-super   92 =============      |
| #2 zen-default        89 ============       |
| #3 llama-3.3-70b      84 ===========        |
| #4 gemini-3.5-flash   81 ==========         |
+---------------------------------------------+
| Reliability          | Speed (p50)           |
| NIM:  99.1% =====   | NIM:  280ms =====    |
| Zen:  98.2% ====    | Zen:  340ms ====     |
| OR:   95.8% ====    | OR:   420ms ===      |
+---------------------------------------------+
| Daily Usage                                  |
| Mon ============ 234                         |
| Tue ============== 289                       |
| Wed ========== 198                           |
| Thu ================ 312                     |
+---------------------------------------------+
| Savings                                      |
| RTK compression: 34% (~124k tokens saved)    |
| Total cost this week: $0.00 (100% free)      |
+---------------------------------------------+
```

**Components:**

| Component | File | Purpose |
|-----------|------|---------|
| `TelemetryDashboard.vue` | `src/frontend/src/components/telemetry/TelemetryDashboard.vue` | Page container with chart grid |
| `ModelRankings.vue` | `src/frontend/src/components/telemetry/ModelRankings.vue` | Ranked table with score bars |
| `ReliabilityChart.vue` | `src/frontend/src/components/telemetry/ReliabilityChart.vue` | Horizontal bars per provider |
| `SpeedChart.vue` | `src/frontend/src/components/telemetry/SpeedChart.vue` | Horizontal bars per provider |
| `UsageChart.vue` | `src/frontend/src/components/telemetry/UsageChart.vue` | Vertical bars per day |
| `SavingsSummary.vue` | `src/frontend/src/components/telemetry/SavingsSummary.vue` | RTK savings card |

**Interactions:**
- Time period selector: [24h] [7d] [30d] toggles all charts
- Model ranking rows expandable: click to see score breakdown (reliability, speed, quality, cost, recency weights)
- Top 3 models highlighted with accent color
- Charts render with CSS bars (no external charting library for bundle size)
- Auto-refresh every 60 seconds
- Color coding: green > 95%/< 500ms, yellow 90-95%/500-1000ms, red < 90%/> 1000ms

**Data flow:** `useTelemetry()` composable calls four endpoints:
- `GET /api/telemetry/rankings?period=7d` -> ModelScore[]
- `GET /api/telemetry/usage?period=7d` -> DailyUsage[]
- `GET /api/telemetry/reliability?period=7d` -> ProviderReliability[]
- `GET /api/telemetry/speed?period=7d` -> ProviderSpeed[]

## Acceptance Criteria

- [ ] Model rankings table sorted by composite score descending
- [ ] Score displayed as numeric value (0-100) and horizontal bar
- [ ] Reliability chart: per-provider success rate % with color coding
- [ ] Speed chart: per-provider p50 latency with color coding
- [ ] Daily usage chart: request count per day for selected period
- [ ] Savings summary: RTK compression %, tokens saved, total cost
- [ ] Time period selector toggles all charts (24h, 7d, 30d)
- [ ] Admin view shows aggregate across all tenants
- [ ] User view shows only their own usage data
- [ ] Charts render without external charting library (CSS bars)
- [ ] Auto-refresh every 60 seconds

## Implementation Notes

- All queries against `usage_log` table with time windowing (WHERE timestamp > ?)
- Data aggregation in SQLite: GROUP BY provider, GROUP BY date
- Rankings computed from usage_log: AVG(success), AVG(latency_ms), composite formula
- No D3 or Chart.js: CSS-only bars keep bundle small and avoid dependencies
- Backend scoping: tenant_id filter applied automatically via auth middleware

## Test Coverage

- Unit: `tests/unit/frontend/components/telemetry/ModelRankings.test.ts`
- Unit: `tests/unit/frontend/components/telemetry/UsageChart.test.ts`
- Unit: `tests/unit/backend/api/telemetry.routes.test.ts`
- Integration: `tests/integration/telemetry/scoring.test.ts`
- E2E: `tests/e2e/telemetry/dashboard.spec.ts`
