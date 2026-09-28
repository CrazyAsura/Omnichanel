CREATE TABLE managed_document (
    id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    owner NVARCHAR(120) NOT NULL,
    size NVARCHAR(50) NOT NULL,
    type NVARCHAR(20) NOT NULL,
    access_level NVARCHAR(30) NOT NULL,
    is_deleted BIT NOT NULL DEFAULT 0,
    deletion_reason NVARCHAR(500) NULL,
    deleted_at DATETIME2 NULL,
    created_at DATETIME2 NOT NULL,
    updated_at DATETIME2 NOT NULL,
    CONSTRAINT uq_managed_document_name UNIQUE (name)
);

CREATE INDEX ix_managed_document_deleted ON managed_document (is_deleted, updated_at DESC);
CREATE INDEX ix_managed_document_name ON managed_document (name);
