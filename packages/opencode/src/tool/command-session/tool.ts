import { Effect } from "effect"
import * as Tool from "../tool"
import * as Pty from "@opencode-ai/core/pty"
import { DEFAULT_MAX_RUNTIME_MS, DEFAULT_INACTIVITY_TIMEOUT_MS, Parameters } from "./schema"
import { InstanceState } from "@/effect/instance-state"
import * as Truncate from "../truncate"
import { Agent } from "@/agent/agent"
import type { PtyID } from "@opencode-ai/core/pty/schema"

// Helper to cast string to PtyID
const toPtyId = (id: string): PtyID => id as unknown as PtyID

type Metadata = {
  sessionId: string
  status?: string
  pid?: number
  startedAt?: string
  maxRuntimeMs?: number
  inactivityTimeoutMs?: number
  hasMore?: boolean
  bytes?: number
  count?: number
  runtimeMs?: number
  idleMs?: number
}

export const CommandSessionTool = Tool.define(
  "command_session",
  Effect.gen(function* () {
    yield* Truncate.Service
    yield* Agent.Service
    const ptyService = yield* Pty.Service
    const instance = yield* InstanceState.context

    return {
      description:
        "Manage long-running interactive commands in persistent PTY sessions. Start commands, poll for output, send input, interrupt, or terminate sessions. Use for dev servers, long-running scripts, or any command that needs to run while the agent continues working.",
      parameters: Parameters,
      execute: (params: Parameters, ctx: Tool.Context) =>
        Effect.gen(function* () {
          // Start action
          if (params.action === "start") {
            const cwd = params.cwd ?? instance.directory
            const maxRuntimeMs = params.maxRuntimeMs || DEFAULT_MAX_RUNTIME_MS
            const inactivityTimeoutMs = params.inactivityTimeoutMs || DEFAULT_INACTIVITY_TIMEOUT_MS

            const info = yield* ptyService.create({
              command: params.command,
              args: [...(params.args ?? [])],
              cwd,
              env: params.env,
              title: `${params.command} ${(params.args ?? []).join(" ")}`,
            })

            return {
              title: `Started: ${params.command}`,
              metadata: {
                sessionId: info.id,
                status: info.status,
                pid: info.pid,
                startedAt: new Date().toISOString(),
                maxRuntimeMs,
                inactivityTimeoutMs,
              } as Metadata,
              output: `Command "${params.command}" started with PID ${info.pid}`,
            }
          }

          // Poll action
          if (params.action === "poll") {
            const sessionId = toPtyId(params.sessionId)
            const info = yield* ptyService.get(sessionId).pipe(Effect.orDie)
            const attachment = yield* ptyService
              .attach(sessionId, {
                cursor: params.stdoutCursor ?? 0,
                onData: () => {},
                onEnd: () => {},
              })
              .pipe(Effect.orDie)

            return {
              title: `Poll: ${info.status}`,
              metadata: {
                sessionId: info.id,
                status: info.status,
                pid: info.pid,
                startedAt: new Date().toISOString(),
                hasMore: info.status === "running",
              } as Metadata,
              output: `Output: ${attachment.replay || "No new output"}`,
            }
          }

          // Write action
          if (params.action === "write") {
            const sessionId = toPtyId(params.sessionId)
            const info = yield* ptyService.get(sessionId).pipe(Effect.orDie)
            yield* ptyService.write(sessionId, params.data).pipe(Effect.orDie)

            return {
              title: `Wrote to session`,
              metadata: { sessionId: info.id, bytes: params.data.length } as Metadata,
              output: `Wrote ${params.data.length} bytes to session ${info.id}`,
            }
          }

          // Interrupt action
          if (params.action === "interrupt") {
            const sessionId = toPtyId(params.sessionId)
            const info = yield* ptyService.get(sessionId).pipe(Effect.orDie)
            yield* ptyService.write(sessionId, "\x03").pipe(Effect.orDie)

            return {
              title: "Interrupted",
              metadata: { sessionId: info.id } as Metadata,
              output: `Sent interrupt to session ${info.id}`,
            }
          }

          // Terminate action
          if (params.action === "terminate") {
            const sessionId = toPtyId(params.sessionId)
            const info = yield* ptyService.get(sessionId).pipe(Effect.orDie)
            yield* ptyService.remove(sessionId).pipe(Effect.orDie)

            return {
              title: "Terminated",
              metadata: { sessionId: info.id } as Metadata,
              output: `Terminated session ${info.id}`,
            }
          }

          // List action
          if (params.action === "list") {
            const sessions = yield* ptyService.list()

            const output =
              sessions.length === 0
                ? "No active command sessions"
                : sessions
                    .map((s) => `${s.id} - ${s.command} ${s.args.join(" ")} [${s.status}]`)
                    .join("\n")

            return {
              title: "Active Sessions",
              metadata: { count: sessions.length } as Metadata,
              output,
            }
          }

          // Status action
          if (params.action === "status") {
            const sessionId = toPtyId(params.sessionId)
            const info = yield* ptyService.get(sessionId).pipe(Effect.orDie)

            return {
              title: `Status: ${info.status}`,
              metadata: {
                sessionId: info.id,
                status: info.status,
                pid: info.pid,
                startedAt: new Date().toISOString(),
                runtimeMs: 0,
                idleMs: 0,
              } as Metadata,
              output: `Session ${info.id}: ${info.status} (PID ${info.pid})`,
            }
          }

          // Should never reach here - Zod validates action
          throw new Error(`Unknown action: ${(params as any).action}`)
        }),
    }
  }),
)
