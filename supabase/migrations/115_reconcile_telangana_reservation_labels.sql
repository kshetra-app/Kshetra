BEGIN;

-- ECI Telangana Legislative Election 2023, Constituency Data Summary:
-- AC 1 Sirpur (GEN) and AC 86 Devarakonda (ST).
-- https://www.eci.gov.in/eci-backend/public/all_files/full-statistical-reports/telangana/2023/Constituency_Data_Summery_Report.pdf
WITH verified(id, ac_no, name, old_status, new_status, old_version, new_version) AS (
  VALUES
    ('TS-AC-1', 1, 'Sirpur', 'ST', 'GEN', 'st', 'general'),
    ('TS-AC-86', 86, 'Devarakonda', 'GEN', 'ST', 'general', 'st')
),
matched_seats AS (
  SELECT seat.id, seat.internal_id, verified.old_status, verified.new_status,
         verified.old_version, verified.new_version
  FROM public.constituencies AS seat
  JOIN verified ON seat.id = verified.id AND seat.state_code = 'TS'
    AND seat.ac_no = verified.ac_no AND seat.name = verified.name
  WHERE seat.reservation_status IN (verified.old_status, verified.new_status)
),
updated_seats AS (
  UPDATE public.constituencies AS seat
  SET reservation_status = matched_seats.new_status
  FROM matched_seats
  WHERE seat.id = matched_seats.id AND seat.reservation_status = matched_seats.old_status
)
UPDATE public.constituency_versions AS version
SET reservation = matched_seats.new_version
FROM matched_seats
WHERE version.constituency_internal_id = matched_seats.internal_id
  AND version.is_current AND version.reservation = matched_seats.old_version;

COMMIT;
