CREATE SCHEMA IF NOT EXISTS metering;
REVOKE ALL ON SCHEMA metering FROM PUBLIC;
CREATE TABLE IF NOT EXISTS metering.fixture_manifest (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), fingerprint text NOT NULL,
  as_of timestamptz NOT NULL, provenance jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS metering.meters (
  id text PRIMARY KEY, name text NOT NULL, resource text NOT NULL, unit text NOT NULL,
  building text NOT NULL, floor integer NOT NULL, expected_interval_minutes integer NOT NULL CHECK(expected_interval_minutes > 0)
);
CREATE TABLE IF NOT EXISTS metering.readings (
  meter_id text NOT NULL REFERENCES metering.meters(id), recorded_at timestamptz NOT NULL,
  cumulative_value double precision NOT NULL CHECK(cumulative_value >= 0 AND cumulative_value < 'Infinity'::float8),
  quality text NOT NULL CHECK(quality IN ('valid','invalid')), reset boolean NOT NULL,
  PRIMARY KEY(meter_id, recorded_at)
);
CREATE OR REPLACE VIEW metering.interval_usage AS
WITH lagged AS (
  SELECT r.*, lag(recorded_at) OVER w AS interval_start,
    lag(cumulative_value) OVER w AS previous_value, lag(quality) OVER w AS previous_quality
  FROM metering.readings r WINDOW w AS(PARTITION BY meter_id ORDER BY recorded_at)
), checked AS (
  SELECT l.*, CASE
    WHEN interval_start IS NULL THEN 'no_previous_reading'
    WHEN quality <> 'valid' OR previous_quality <> 'valid' THEN 'invalid_reading'
    WHEN reset THEN 'meter_reset'
    WHEN cumulative_value < previous_value THEN 'negative_delta'
    WHEN recorded_at - interval_start > make_interval(mins => m.expected_interval_minutes) THEN 'missing_readings'
  END AS warning_reason
  FROM lagged l JOIN metering.meters m ON m.id = l.meter_id
)
SELECT meter_id, interval_start, recorded_at AS interval_end,
  CASE WHEN warning_reason IS NULL THEN cumulative_value - previous_value END AS usage, warning_reason
FROM checked;
GRANT USAGE ON SCHEMA metering TO analyst;
GRANT SELECT ON ALL TABLES IN SCHEMA metering TO analyst;
