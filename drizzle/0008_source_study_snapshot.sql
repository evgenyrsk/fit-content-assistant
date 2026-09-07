ALTER TABLE source_assessment_reader_briefs
ADD COLUMN study_snapshot_json TEXT;

PRAGMA optimize;
