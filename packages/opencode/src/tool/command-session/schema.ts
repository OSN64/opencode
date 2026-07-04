import { Schema } from "effect"

// Action names for the tool
export const Action = Schema.Literals([
  "start",
  "poll",
  "write",
  "interrupt",
  "terminate",
  "list",
  "status",
])

export type Action = Schema.Schema.Type<typeof Action>

// Common parameters
export const SessionIdParam = Schema.String.annotate({ description: "Session ID" })

export const CwdParam = Schema.optional(Schema.String).annotate({
  description: "Working directory for the command",
})

export const EnvParam = Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
  description: "Environment variables",
})

export const DescriptionParam = Schema.optional(Schema.String).annotate({
  description: "Description of what the command does",
})

// Start action parameters
export const StartParams = Schema.Struct({
  action: Schema.Literal("start"),
  command: Schema.String.annotate({
    description: "The command to run",
  }),
  args: Schema.Array(Schema.String).pipe(
    Schema.optional,
    Schema.annotate({ description: "Command arguments" }),
  ),
  cwd: CwdParam,
  env: EnvParam,
  description: DescriptionParam,
  // Timeout configuration
  maxRuntimeMs: Schema.optional(Schema.Number).annotate({
    description: "Maximum runtime in milliseconds (default: 2 minutes)",
  }),
  inactivityTimeoutMs: Schema.optional(Schema.Number).annotate({
    description: "Timeout for inactivity in milliseconds (default: 5 minutes)",
  }),
})

export type StartParams = Schema.Schema.Type<typeof StartParams>

// Poll action parameters
export const PollParams = Schema.Struct({
  action: Schema.Literal("poll"),
  sessionId: Schema.String.annotate({ description: "Session ID to poll" }),
  stdoutCursor: Schema.optional(Schema.Number).annotate({
    description: "Output cursor for stdout (default: 0)",
  }),
  stderrCursor: Schema.optional(Schema.Number).annotate({
    description: "Output cursor for stderr (default: 0)",
  }),
  description: DescriptionParam,
})

export type PollParams = Schema.Schema.Type<typeof PollParams>

// Write action parameters
export const WriteParams = Schema.Struct({
  action: Schema.Literal("write"),
  sessionId: Schema.String.annotate({ description: "Session ID to write to" }),
  data: Schema.String.annotate({
    description: "Data to write (use \\x03 for Ctrl+C, \\x04 for Ctrl+D)",
  }),
  description: DescriptionParam,
})

export type WriteParams = Schema.Schema.Type<typeof WriteParams>

// Interrupt action parameters
export const InterruptParams = Schema.Struct({
  action: Schema.Literal("interrupt"),
  sessionId: Schema.String.annotate({ description: "Session ID to interrupt" }),
  description: DescriptionParam,
})

export type InterruptParams = Schema.Schema.Type<typeof InterruptParams>

// Terminate action parameters
export const TerminateParams = Schema.Struct({
  action: Schema.Literal("terminate"),
  sessionId: Schema.String.annotate({ description: "Session ID to terminate" }),
  description: DescriptionParam,
})

export type TerminateParams = Schema.Schema.Type<typeof TerminateParams>

// List action parameters
export const ListParams = Schema.Struct({
  action: Schema.Literal("list"),
  description: DescriptionParam,
})

export type ListParams = Schema.Schema.Type<typeof ListParams>

// Status action parameters
export const StatusParams = Schema.Struct({
  action: Schema.Literal("status"),
  sessionId: Schema.String.annotate({ description: "Session ID to get status for" }),
  description: DescriptionParam,
})

export type StatusParams = Schema.Schema.Type<typeof StatusParams>

// All parameters union
export const Parameters = Schema.Union([
  StartParams,
  PollParams,
  WriteParams,
  InterruptParams,
  TerminateParams,
  ListParams,
  StatusParams,
])

export type Parameters = Schema.Schema.Type<typeof Parameters>

// Default timeouts
export const DEFAULT_MAX_RUNTIME_MS = 2 * 60 * 1000 // 2 minutes
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
