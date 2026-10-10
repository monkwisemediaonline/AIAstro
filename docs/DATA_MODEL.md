# Data Model (SQLite + Drizzle)

All tables have `id TEXT PRIMARY KEY` (uuid v7), `created_at`, `updated_at`.
JSON columns are validated with Zod on write.

```sql
person (
  id, display_name, relationship TEXT CHECK (relationship IN ('self','spouse','daughter','son','parent','other')),
  is_minor INTEGER, privacy_level TEXT CHECK (privacy_level IN ('normal','high')),
  ai_allowed INTEGER DEFAULT 0,          -- per-person AI opt-in
  status TEXT CHECK (status IN ('draft','confirmed')),
  notes TEXT
)

birth_data (
  id, person_id → person ON DELETE CASCADE,
  local_date TEXT NOT NULL,              -- 'YYYY-MM-DD' as entered
  time_kind TEXT CHECK (time_kind IN ('exact','range','unknown')),
  local_time TEXT, range_from TEXT, range_to TEXT,
  confidence TEXT CHECK (confidence IN ('certificate','exact','family_reported','approximate','unknown')),
  place_name TEXT, lat REAL, lon REAL, place_source TEXT,   -- 'geonames:1264728' etc.
  iana_tz TEXT, utc_offset_minutes INTEGER, tzdb_version TEXT,
  utc_instant TEXT, utc_from TEXT, utc_to TEXT,
  data_source TEXT                        -- 'birth certificate', 'mother', ...
)

person_name (
  id, person_id → person ON DELETE CASCADE,
  name TEXT, script TEXT, transliteration TEXT,
  usage TEXT CHECK (usage IN ('primary','legal','nickname','business','variant')),
  effective_from TEXT, effective_to TEXT
)

chart_settings (
  id, label, ayanamsha, node, house_system, dasha_year_days REAL,
  combustion_orbs JSON, rule_set_version TEXT, extra JSON, is_default INTEGER
)

chart_result (                            -- cached, reproducible
  id, birth_data_id → birth_data ON DELETE CASCADE, settings_id → chart_settings,
  sample_time_utc TEXT,                   -- for range births: one row per sample
  engine TEXT, engine_version TEXT, app_version TEXT,
  input_hash TEXT UNIQUE,                 -- hash(birth inputs + settings + versions)
  payload JSON                            -- planets, houses, vargas, nakshatras
)

dasha_period (
  id, chart_result_id → chart_result ON DELETE CASCADE,
  level INTEGER,                          -- 1 MD, 2 AD, 3 PD
  lord TEXT, parent_id, start_utc TEXT, end_utc TEXT
)

rule (
  id TEXT PRIMARY KEY,                    -- 'PAR-RY-001'
  school, category, name, version, status, requires JSON, definition_ref TEXT
)

source (
  id, title, author, edition, translator, language, publisher, year,
  owned INTEGER, notes TEXT
)

rule_source ( rule_id → rule, source_id → source, locator TEXT, note TEXT, reviewed_by TEXT, reviewed_at TEXT )

yoga_result (
  id, chart_result_id → chart_result ON DELETE CASCADE, rule_id, rule_version,
  status, payload JSON                    -- instances, conditions, modifiers, strength
)

remedy ( … as REMEDIES_SPEC §1, sources via remedy_source )
remedy_source ( remedy_id, source_id, locator )

practice (                                -- owner's chosen remedy practice
  id, person_id, remedy_id, start_date, end_date, target_count INTEGER,
  schedule JSON, status TEXT CHECK (status IN ('planned','active','paused','done','dropped'))
)
practice_log ( id, practice_id, date, count INTEGER, done INTEGER, note TEXT, rating INTEGER )

daan_log ( id, person_id, date, item, recipient_type, amount_inr REAL, note )
budget ( id, kind TEXT CHECK (kind IN ('daan','remedy_total')), monthly_cap_inr REAL )

gemstone_note ( id, person_id, stone, planet, reasoning_snapshot JSON, practitioner TEXT,
  cost_inr REAL, decision TEXT CHECK (decision IN ('researching','decided_yes','decided_no')), note )

numerology_comparison ( id, person_id, label, system_versions JSON, inputs JSON, results JSON, note )

business_metric ( id, month TEXT, revenue_inr REAL, gross_margin_pct REAL, cash_inr REAL,
  pipeline_inr REAL, deals_won INTEGER, team_size INTEGER, note )
business_goal ( id, title, house_tag INTEGER, target TEXT, deadline TEXT, status, note )

retrospective ( id, person_id, window_start, window_end, claim_ref TEXT,
  expected TEXT, actual TEXT, rating INTEGER, note )

ai_settings ( id, enabled INTEGER DEFAULT 0, provider TEXT, model TEXT,
  send_fields JSON, store_conversations INTEGER DEFAULT 0 )
ai_conversation ( id, person_id, created_at, messages JSON )   -- only if store_conversations
```

## Rules
- Deleting a person cascades to everything derived from them.
- `chart_result.input_hash` makes calculations reproducible and cacheable; changing
  settings or engine version creates a new row, old ones stay for audit until purged.
- No birth data columns ever appear in log output; the logger redacts `birth_data`,
  `person_name`, `lat`, `lon`.
- Export: `GET /export` (server action) → JSON of all tables for one person, or the whole
  DB as an encrypted zip. Import validates schema version.
