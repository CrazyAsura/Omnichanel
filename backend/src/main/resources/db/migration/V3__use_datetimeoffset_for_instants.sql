DROP INDEX ix_security_audit_event_occurred_at ON security_audit_event;
DROP INDEX ix_security_audit_event_actor_occurred ON security_audit_event;
DROP INDEX ix_managed_document_deleted ON managed_document;

ALTER TABLE security_audit_event
    ALTER COLUMN occurred_at DATETIMEOFFSET(6) NOT NULL;

ALTER TABLE managed_document
    ALTER COLUMN deleted_at DATETIMEOFFSET(6) NULL;

ALTER TABLE managed_document
    ALTER COLUMN created_at DATETIMEOFFSET(6) NOT NULL;

ALTER TABLE managed_document
    ALTER COLUMN updated_at DATETIMEOFFSET(6) NOT NULL;

CREATE INDEX ix_security_audit_event_occurred_at ON security_audit_event (occurred_at);
CREATE INDEX ix_security_audit_event_actor_occurred ON security_audit_event (actor_id, occurred_at);
CREATE INDEX ix_managed_document_deleted ON managed_document (is_deleted, updated_at DESC);
