import { describe, it, expect } from "vitest";
import * as S from "@effect/schema/Schema";

// --- Shared helpers ---

/** Round-trip: encode then decode and assert deep-equality with the original. */
function roundTrip<A>(schema: S.Schema<A>, value: A): void {
  const encoded = S.encodeSync(schema)(value);
  const decoded = S.decodeSync(schema)(encoded);
  expect(decoded).toEqual(value);
}

// --- Example contract types (import from your actual contracts package) ---

const CheckpointId = S.String.pipe(S.brand("CheckpointId"));
const SessionId = S.String.pipe(S.brand("SessionId"));

const CheckpointSchema = S.Struct({
  id: CheckpointId,
  sessionId: SessionId,
  timestamp: S.Number,
  label: S.optional(S.String),
});

const ServerEventSchema = S.Union(
  S.Struct({ _tag: S.Literal("CheckpointCreated"), checkpoint: CheckpointSchema }),
  S.Struct({ _tag: S.Literal("SessionEnded"), sessionId: SessionId }),
  S.Struct({ _tag: S.Literal("Heartbeat"), ts: S.Number }),
);

// --- Tests ---

describe("CheckpointSchema round-trip", () => {
  it("encodes and decodes a checkpoint without a label", () => {
    roundTrip(CheckpointSchema, {
      id: "chk_001" as any,
      sessionId: "sess_abc" as any,
      timestamp: 1_700_000_000_000,
    });
  });

  it("encodes and decodes a checkpoint with a label", () => {
    roundTrip(CheckpointSchema, {
      id: "chk_002" as any,
      sessionId: "sess_abc" as any,
      timestamp: 1_700_000_001_000,
      label: "before refactor",
    });
  });

  it("rejects missing required fields", () => {
    expect(() =>
      S.decodeSync(CheckpointSchema)({ sessionId: "sess_abc", timestamp: 0 })
    ).toThrow();
  });
});

describe("ServerEventSchema round-trip", () => {
  it("round-trips CheckpointCreated", () => {
    roundTrip(ServerEventSchema, {
      _tag: "CheckpointCreated",
      checkpoint: { id: "chk_003" as any, sessionId: "sess_xyz" as any, timestamp: 0 },
    });
  });

  it("round-trips SessionEnded", () => {
    roundTrip(ServerEventSchema, { _tag: "SessionEnded", sessionId: "sess_xyz" as any });
  });

  it("round-trips Heartbeat", () => {
    roundTrip(ServerEventSchema, { _tag: "Heartbeat", ts: Date.now() });
  });

  it("rejects unknown _tag", () => {
    expect(() =>
      S.decodeSync(ServerEventSchema)({ _tag: "Unknown" })
    ).toThrow();
  });
});
