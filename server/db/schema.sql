DROP TABLE IF EXISTS cybraxis_final_reports CASCADE;
DROP TABLE IF EXISTS cybraxis_stage_results CASCADE;
DROP TABLE IF EXISTS cybraxis_events CASCADE;
DROP TABLE IF EXISTS cybraxis_sessions CASCADE;

CREATE TABLE cybraxis_sessions (
  id TEXT PRIMARY KEY,

  user_id TEXT NOT NULL DEFAULT 'local-user',

  scenario_id TEXT NOT NULL,
  scenario_name TEXT,

  status TEXT NOT NULL DEFAULT 'active',

  current_stage_index INTEGER NOT NULL DEFAULT 0,
  completed_stage_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_stages INTEGER NOT NULL DEFAULT 0,

  final_score INTEGER,
  progression_recommendation TEXT,
  progression_band TEXT,
  progression_reason TEXT,

  recommended_next_scenario_id TEXT,
  recommended_next_scenario_name TEXT,
  recommended_scenario_available BOOLEAN NOT NULL DEFAULT FALSE,

  primary_strength TEXT,
  primary_weakness TEXT,

  variant_seed TEXT,
  progression_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE cybraxis_events (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL REFERENCES cybraxis_sessions(id) ON DELETE CASCADE,

  scenario_id TEXT,
  stage_id TEXT,
  stage_index INTEGER,

  type TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cybraxis_stage_results (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL REFERENCES cybraxis_sessions(id) ON DELETE CASCADE,

  scenario_id TEXT,
  stage_id TEXT NOT NULL,
  stage_index INTEGER NOT NULL,
  stage_name TEXT,

  passed BOOLEAN NOT NULL DEFAULT FALSE,
  timed_out BOOLEAN NOT NULL DEFAULT FALSE,
  lock_reason TEXT,

  score_summary JSONB,
  guidance_profile JSONB,
  investigation_target_coverage JSONB,
  investigation_coverage JSONB,

  action_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  wrong_action_count INTEGER NOT NULL DEFAULT 0,
  hints_requested INTEGER NOT NULL DEFAULT 0,

  time_limit_seconds INTEGER,
  time_remaining INTEGER,

  escalation JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_stage_result_per_session_stage UNIQUE (session_id, stage_id)
);

CREATE TABLE cybraxis_final_reports (
  id TEXT PRIMARY KEY,

  session_id TEXT NOT NULL REFERENCES cybraxis_sessions(id) ON DELETE CASCADE,

  scenario_id TEXT NOT NULL,
  scenario_name TEXT,

  total_score INTEGER NOT NULL DEFAULT 0,

  summary JSONB,
  stage_breakdown JSONB,
  dimensions JSONB,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  final_feedback TEXT,

  progression_recommendation TEXT,
  progression_band TEXT,
  progression_reason TEXT,

  recommended_next_scenario_id TEXT,
  recommended_next_scenario_name TEXT,
  recommended_scenario_available BOOLEAN NOT NULL DEFAULT FALSE,

  primary_strength TEXT,
  primary_weakness TEXT,

  variant_seed TEXT,
  progression_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,

  report JSONB NOT NULL DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cybraxis_sessions_user_id
ON cybraxis_sessions(user_id);

CREATE INDEX idx_cybraxis_sessions_scenario_id
ON cybraxis_sessions(scenario_id);

CREATE INDEX idx_cybraxis_sessions_status
ON cybraxis_sessions(status);

CREATE INDEX idx_cybraxis_events_session_id
ON cybraxis_events(session_id);

CREATE INDEX idx_cybraxis_events_stage_id
ON cybraxis_events(stage_id);

CREATE INDEX idx_cybraxis_stage_results_session_id
ON cybraxis_stage_results(session_id);

CREATE INDEX idx_cybraxis_stage_results_scenario_stage
ON cybraxis_stage_results(scenario_id, stage_id);

CREATE INDEX idx_cybraxis_final_reports_session_id
ON cybraxis_final_reports(session_id);

CREATE INDEX idx_cybraxis_final_reports_scenario_id
ON cybraxis_final_reports(scenario_id);