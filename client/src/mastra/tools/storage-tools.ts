import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { postgresStore } from '../storage';

// Input schemas
const getRecentTracesSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
});

const getTraceByIdSchema = z
  .object({
    id: z.string().optional(),
    traceId: z.string().optional(),
  })
  .refine((v) => Boolean(v.id || v.traceId), {
    message: 'Provide either id or traceId',
  });

const searchTracesSchema = z.object({
  name: z.string().optional(),
  statusCode: z.number().int().optional(),
  sinceHours: z.number().int().min(1).max(720).optional(),
  limit: z.number().int().min(1).max(500).optional().default(50),
});

const listThreadsSchema = z.object({
  resourceId: z.string().optional(),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

const getThreadMessagesSchema = z.object({
  threadId: z.string(),
  limit: z.number().int().min(1).max(500).optional(),
  format: z.enum(['v1', 'v2']).optional().default('v1'),
});

// Output schemas
const tracesArraySchema = z.array(
  z.object({}).passthrough()
);

const threadsArraySchema = z.array(
  z.object({}).passthrough()
);

export const getRecentTraces = createTool({
  id: 'get-recent-traces',
  description: 'List recent Mastra traces stored in PostgreSQL',
  inputSchema: getRecentTracesSchema,
  outputSchema: z.object({ traces: tracesArraySchema }),
  execute: async ({ context }) => {
    const limit = context.limit ?? 50;
    const rows = await postgresStore.db.any(
      `
      select
        id,
        "traceId" as traceId,
        name,
        scope,
        kind,
        status,
        to_timestamp("startTime"/1e9) as started_at,
        to_timestamp("endTime"/1e9) as ended_at,
        (("endTime" - "startTime") / 1000000.0) as duration_ms,
        "createdAt"
      from mastra_traces
      order by "createdAt" desc
      limit $1
      `,
      [limit]
    );
    return { traces: rows };
  },
});

export const getTraceById = createTool({
  id: 'get-trace-by-id',
  description: 'Fetch a single trace by span id or traceId',
  inputSchema: getTraceByIdSchema,
  outputSchema: z.object({ trace: z.object({}).passthrough().nullable() }),
  execute: async ({ context }) => {
    const { id, traceId } = context;
    const where = id ? 'id = $1' : '"traceId" = $1';
    const value = id ?? traceId;
    const row = await postgresStore.db.oneOrNone(
      `
      select
        id,
        "parentSpanId" as parentSpanId,
        "traceId" as traceId,
        name,
        scope,
        kind,
        attributes,
        status,
        events,
        links,
        other,
        "startTime",
        "endTime",
        to_timestamp("startTime"/1e9) as started_at,
        to_timestamp("endTime"/1e9) as ended_at,
        (("endTime" - "startTime") / 1000000.0) as duration_ms,
        "createdAt"
      from mastra_traces
      where ${where}
      order by "createdAt" desc
      limit 1
      `,
      [value]
    );
    return { trace: row };
  },
});

export const searchTraces = createTool({
  id: 'search-traces',
  description: 'Search traces by name pattern, status code, and time window',
  inputSchema: searchTracesSchema,
  outputSchema: z.object({ traces: tracesArraySchema }),
  execute: async ({ context }) => {
    const { name, statusCode, sinceHours, limit = 50 } = context;

    const conditions: string[] = [];
    const params: any[] = [];

    if (name) {
      params.push(`%${name}%`);
      conditions.push(`name ilike $${params.length}`);
    }
    if (typeof statusCode === 'number') {
      // status is a JSONB with shape { code: 0|1|2, message?: string }
      params.push(statusCode);
      conditions.push(`(status->>'code')::int = $${params.length}`);
    }
    if (sinceHours) {
      params.push(sinceHours);
      conditions.push(`"createdAt" >= now() - ($${params.length}::text || ' hours')::interval`);
    }
    params.push(limit);

    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    const rows = await postgresStore.db.any(
      `
      select
        id,
        "traceId" as traceId,
        name,
        scope,
        kind,
        status,
        to_timestamp("startTime"/1e9) as started_at,
        to_timestamp("endTime"/1e9) as ended_at,
        (("endTime" - "startTime") / 1000000.0) as duration_ms,
        "createdAt"
      from mastra_traces
      ${where}
      order by "createdAt" desc
      limit $${params.length}
      `,
      params
    );
    return { traces: rows };
  },
});

export const listThreads = createTool({
  id: 'list-threads',
  description: 'List recent conversation threads, optionally by resourceId',
  inputSchema: listThreadsSchema,
  outputSchema: z.object({ threads: threadsArraySchema }),
  execute: async ({ context }) => {
    const { resourceId, limit = 50 } = context;
    const rows = await postgresStore.db.any(
      `
      select id, "resourceId", title, metadata, "createdAt", "updatedAt"
      from mastra_threads
      ${resourceId ? 'where "resourceId" = $1' : ''}
      order by "updatedAt" desc
      limit $${resourceId ? 2 : 1}
      `,
      resourceId ? [resourceId, limit] : [limit]
    );
    return { threads: rows };
  },
});

export const getThreadMessages = createTool({
  id: 'get-thread-messages',
  description: 'Get messages for a thread via Mastra storage API',
  inputSchema: getThreadMessagesSchema,
  outputSchema: z.object({ messages: z.array(z.any()) }),
  execute: async ({ mastra, context }) => {
    const { threadId, format = 'v1', limit } = context;
    if (!mastra) {
      return { messages: [] };
    }
    const storage = mastra.getStorage();
    if (!storage) {
      return { messages: [] };
    }
    let messages: any[] = [];
    if (format === 'v2') {
      // v2 overload requires explicit format
      messages = (await storage.getMessages({ threadId, format: 'v2' })) as any[];
    } else {
      // default v1 overload
      messages = (await storage.getMessages({ threadId })) as any[];
    }
    if (limit && Number.isFinite(limit)) {
      messages = messages.slice(-limit);
    }
    return { messages };
  },
});


const recentMessagesSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(20),
});

export const getRecentMessages = createTool({
  id: 'recent-messages',
  description: 'Last N messages across all threads with thread metadata',
  inputSchema: recentMessagesSchema,
  outputSchema: z.object({
    messages: z.array(
      z.object({}).passthrough()
    ),
  }),
  execute: async ({ context }) => {
    const limit = context.limit ?? 20;
    const rows = await postgresStore.db.any(
      `
      select
        m.id,
        m.thread_id,
        t."title",
        t."resourceId",
        m.role,
        left(m.content, 200) as content_excerpt,
        m."createdAt"
      from mastra_messages m
      join mastra_threads t on t.id = m.thread_id
      order by m."createdAt" desc
      limit $1
      `,
      [limit]
    );
    return { messages: rows };
  },
});

const latestMessagePerThreadSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const getLatestMessagePerThread = createTool({
  id: 'latest-message-per-thread',
  description: 'Latest message for each thread with thread metadata',
  inputSchema: latestMessagePerThreadSchema,
  outputSchema: z.object({
    messages: z.array(z.object({}).passthrough()),
  }),
  execute: async ({ context }) => {
    const limit = context.limit ?? 50;
    const rows = await postgresStore.db.any(
      `
      with last_msg as (
        select distinct on (m.thread_id)
          m.thread_id,
          t."title",
          t."resourceId",
          m.role,
          left(m.content,200) as content_excerpt,
          m."createdAt"
        from mastra_messages m
        join mastra_threads t on t.id=m.thread_id
        order by m.thread_id, m."createdAt" desc
      )
      select * from last_msg
      order by "createdAt" desc
      limit $1
      `,
      [limit]
    );
    return { messages: rows };
  },
});

const topThreadsByMessagesSchema = z.object({
  limit: z.number().int().min(1).max(200).optional().default(50),
});

export const getTopThreadsByMessages = createTool({
  id: 'top-threads-by-messages',
  description: 'Threads with the highest message counts',
  inputSchema: topThreadsByMessagesSchema,
  outputSchema: z.object({ threads: z.array(z.object({}).passthrough()) }),
  execute: async ({ context }) => {
    const limit = context.limit ?? 50;
    const rows = await postgresStore.db.any(
      `
      select t.id, t."title", t."resourceId", count(*) as message_count
      from mastra_messages m
      join mastra_threads t on t.id = m.thread_id
      group by t.id, t."title", t."resourceId"
      order by message_count desc
      limit $1
      `,
      [limit]
    );
    return { threads: rows };
  },
});

const recentErrorTracesSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  sinceHours: z.number().int().min(1).max(720).optional(),
});

export const getRecentErrorTraces = createTool({
  id: 'recent-error-traces',
  description: 'Recent spans with status.code = 1',
  inputSchema: recentErrorTracesSchema,
  outputSchema: z.object({ traces: z.array(z.object({}).passthrough()) }),
  execute: async ({ context }) => {
    const { limit = 50, sinceHours } = context;
    const conditions: string[] = ['(status->>\'code\')::int = 1'];
    const params: any[] = [];
    if (sinceHours) {
      params.push(sinceHours);
      conditions.push(`"createdAt" >= now() - ($${params.length}::text || ' hours')::interval`);
    }
    params.push(limit);
    const where = `where ${conditions.join(' and ')}`;
    const rows = await postgresStore.db.any(
      `
      select
        id,
        "traceId",
        name,
        (status->>'code')::int as code,
        status->>'message' as error_message,
        to_timestamp("startTime"/1e9) as started_at,
        (("endTime" - "startTime") / 1000000.0) as duration_ms
      from mastra_traces
      ${where}
      order by "createdAt" desc
      limit $${params.length}
      `,
      params
    );
    return { traces: rows };
  },
});

const slowestSpansSchema = z.object({
  limit: z.number().int().min(1).max(500).optional().default(50),
  sinceHours: z.number().int().min(1).max(720).optional(),
});

export const getSlowestSpans = createTool({
  id: 'slowest-spans',
  description: 'Slowest spans ordered by duration_ms',
  inputSchema: slowestSpansSchema,
  outputSchema: z.object({ traces: z.array(z.object({}).passthrough()) }),
  execute: async ({ context }) => {
    const { limit = 50, sinceHours } = context;
    const conditions: string[] = [];
    const params: any[] = [];
    if (sinceHours) {
      params.push(sinceHours);
      conditions.push(`"createdAt" >= now() - ($${params.length}::text || ' hours')::interval`);
    }
    params.push(limit);
    const where = conditions.length ? `where ${conditions.join(' and ')}` : '';
    const rows = await postgresStore.db.any(
      `
      select
        id,
        "traceId",
        name,
        (("endTime" - "startTime") / 1000000.0) as duration_ms,
        "createdAt"
      from mastra_traces
      ${where}
      order by duration_ms desc
      limit $${params.length}
      `,
      params
    );
    return { traces: rows };
  },
});

const getTraceFullJsonSchema = z.object({
  traceId: z.string(),
});

export const getTraceFullJson = createTool({
  id: 'get-trace-full-json',
  description: 'Return a single JSON bundle of all spans in a trace',
  inputSchema: getTraceFullJsonSchema,
  outputSchema: z.object({ trace: z.any() }),
  execute: async ({ context }) => {
    const { traceId } = context;
    const row = await postgresStore.db.oneOrNone(
      `
      select jsonb_build_object(
        'traceId', t."traceId",
        'spans', jsonb_agg(jsonb_build_object(
          'id', t.id,
          'parentSpanId', t."parentSpanId",
          'name', t.name,
          'scope', t.scope,
          'kind', t.kind,
          'attributes', t.attributes,
          'status', t.status,
          'events', t.events,
          'links', t.links,
          'other', t.other,
          'startTime', t."startTime",
          'endTime', t."endTime",
          'duration_ms', ((t."endTime" - t."startTime") / 1000000.0),
          'createdAt', t."createdAt"
        ) order by t."startTime")) as trace
      from mastra_traces t
      where t."traceId" = $1
      group by t."traceId"
      `,
      [traceId]
    );
    return { trace: row?.trace ?? null };
  },
});


export const storageTools = [
  getRecentTraces,
  getTraceById,
  searchTraces,
  listThreads,
  getThreadMessages,
  getRecentMessages,
  getLatestMessagePerThread,
  getTopThreadsByMessages,
  getRecentErrorTraces,
  getSlowestSpans,
  getTraceFullJson,
];
