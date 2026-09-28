CREATE TABLE security_audit_event (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    occurred_at DATETIME2 NOT NULL,
    actor_id NVARCHAR(200) NOT NULL,
    action NVARCHAR(32) NOT NULL,
    resource NVARCHAR(160) NOT NULL,
    outcome NVARCHAR(32) NOT NULL,
    request_id UNIQUEIDENTIFIER NOT NULL
);

CREATE INDEX ix_security_audit_event_occurred_at ON security_audit_event (occurred_at);
CREATE INDEX ix_security_audit_event_actor_occurred ON security_audit_event (actor_id, occurred_at);
