-- Create Mastra framework tables
-- These tables are normally auto-created by @mastra/pg PostgresStore
-- but we're creating them manually for local development

-- Create mastra_threads table
CREATE TABLE IF NOT EXISTS mastra_threads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "resourceId" TEXT,
    title TEXT,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mastra_threads_resource_id ON mastra_threads("resourceId");
CREATE INDEX IF NOT EXISTS idx_mastra_threads_updated_at ON mastra_threads("updatedAt");

-- Create mastra_messages table
CREATE TABLE IF NOT EXISTS mastra_messages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    thread_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    FOREIGN KEY (thread_id) REFERENCES mastra_threads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mastra_messages_thread_id ON mastra_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_mastra_messages_created_at ON mastra_messages("createdAt");

-- Create mastra_traces table for observability/telemetry
CREATE TABLE IF NOT EXISTS mastra_traces (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "traceId" TEXT NOT NULL,
    name TEXT NOT NULL,
    scope TEXT,
    kind TEXT,
    status JSONB,
    "startTime" BIGINT,
    "endTime" BIGINT,
    attributes JSONB DEFAULT '{}',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mastra_traces_trace_id ON mastra_traces("traceId");
CREATE INDEX IF NOT EXISTS idx_mastra_traces_name ON mastra_traces(name);
CREATE INDEX IF NOT EXISTS idx_mastra_traces_created_at ON mastra_traces("createdAt");

-- Create trigger for auto-updating mastra_threads.updatedAt
CREATE OR REPLACE FUNCTION update_mastra_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_mastra_threads_updated_at ON mastra_threads;
CREATE TRIGGER update_mastra_threads_updated_at
    BEFORE UPDATE ON mastra_threads
    FOR EACH ROW
    EXECUTE FUNCTION update_mastra_threads_updated_at();

-- Migration completed
-- Note: These tables are compatible with @mastra/pg PostgresStore

