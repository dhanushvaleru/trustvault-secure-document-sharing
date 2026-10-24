import crypto from "crypto";
import { prisma } from "../db/prisma.js";
import { Prisma } from "@prisma/client";
import { AuditAction, AuditOutcome, AuditEventData } from "../types/index.js";

export const GENESIS_HASH = "0".repeat(64);

/**
 * Creates a deterministic canonical representation of the event fields.
 * Keys are strictly sorted and JSON values are normalized.
 */
export function canonicalizeEventData(data: {
  id: string;
  sequence?: number;
  timestamp: string; // ISO 8601 UTC
  actorUserId: string | null;
  actionType: string;
  documentId: string | null;
  targetUserId: string | null;
  outcome: string;
  correlationId: string;
  metadataJson: string | null;
  previousHash: string;
}): string {
  const canonicalObject = {
    actionType: data.actionType,
    actorUserId: data.actorUserId ?? null,
    correlationId: data.correlationId,
    documentId: data.documentId ?? null,
    id: data.id,
    metadataJson: data.metadataJson ?? null,
    outcome: data.outcome,
    previousHash: data.previousHash,
    targetUserId: data.targetUserId ?? null,
    timestamp: data.timestamp,
  };

  return JSON.stringify(canonicalObject);
}

/**
 * Computes SHA-256 hash from canonical event representation.
 */
export function calculateEventHash(canonicalData: string): string {
  return crypto.createHash("sha256").update(canonicalData, "utf8").digest("hex");
}

export interface VerificationResult {
  isValid: boolean;
  totalEvents: number;
  verifiedAt: string;
  latestHash: string;
  brokenAtEventId?: string;
  brokenSequence?: number;
  brokenIndex?: number;
  reason?: string;
}

export class AuditService {
  /**
   * Appends an audit event to the tamper-evident hash chain.
   * Can participate in an existing Prisma transaction or run independently.
   * Enforces fail-closed: throws if audit log insertion fails.
   */
  static async recordEvent(
    data: AuditEventData,
    tx?: Prisma.TransactionClient
  ): Promise<{ id: string; currentHash: string; sequence: number }> {
    const client = tx || prisma;

    // Retrieve the most recent event to link the hash chain strictly by sequence
    const lastEvent = await client.auditEvent.findFirst({
      orderBy: { sequence: "desc" },
      select: { currentHash: true, sequence: true },
    });

    const previousHash = lastEvent ? lastEvent.currentHash : GENESIS_HASH;
    const nextSequence = (lastEvent?.sequence ?? 0) + 1;
    const eventId = crypto.randomUUID();
    const timestamp = data.timestamp ? data.timestamp.toISOString() : new Date().toISOString();

    // Clean & normalize metadata with sorted keys
    let metadataJson: string | null = null;
    if (data.metadata) {
      const sortedMetadata: Record<string, any> = {};
      Object.keys(data.metadata)
        .sort()
        .forEach((key) => {
          sortedMetadata[key] = data.metadata![key];
        });
      metadataJson = JSON.stringify(sortedMetadata);
    }

    const canonicalString = canonicalizeEventData({
      id: eventId,
      sequence: nextSequence,
      timestamp,
      actorUserId: data.actorUserId ?? null,
      actionType: data.actionType,
      documentId: data.documentId ?? null,
      targetUserId: data.targetUserId ?? null,
      outcome: data.outcome,
      correlationId: data.correlationId,
      metadataJson,
      previousHash,
    });

    const currentHash = calculateEventHash(canonicalString);

    const created = await client.auditEvent.create({
      data: {
        id: eventId,
        sequence: nextSequence,
        timestamp: new Date(timestamp),
        actorUserId: data.actorUserId ?? null,
        actionType: data.actionType,
        documentId: data.documentId ?? null,
        targetUserId: data.targetUserId ?? null,
        outcome: data.outcome,
        correlationId: data.correlationId,
        metadataJson,
        previousHash,
        currentHash,
      },
      select: {
        id: true,
        currentHash: true,
        sequence: true,
      },
    });

    return created;
  }

  /**
   * Verifies the cryptographic integrity of the entire audit chain.
   * Checks:
   * 1. Genesis hash correctness on initial record.
   * 2. Hash chaining consistency (previousHash matches previous record's currentHash).
   * 3. Current hash recomputation matches stored hash (detects tampering/modification).
   */
  static async verifyChain(): Promise<VerificationResult> {
    const events = await prisma.auditEvent.findMany({
      orderBy: { sequence: "asc" },
    });

    const totalEvents = events.length;
    const verifiedAt = new Date().toISOString();

    if (totalEvents === 0) {
      return {
        isValid: true,
        totalEvents: 0,
        verifiedAt,
        latestHash: GENESIS_HASH,
      };
    }

    let expectedPreviousHash = GENESIS_HASH;

    for (let i = 0; i < totalEvents; i++) {
      const event = events[i];

      // 1. Verify link to previous event
      if (event.previousHash !== expectedPreviousHash) {
        return {
          isValid: false,
          totalEvents,
          verifiedAt,
          latestHash: events[totalEvents - 1].currentHash,
          brokenAtEventId: event.id,
          brokenSequence: event.sequence,
          brokenIndex: i,
          reason: `Broken chain link at sequence ${event.sequence}: expected previousHash ${expectedPreviousHash}, found ${event.previousHash}`,
        };
      }

      // 2. Recompute the hash of this event
      const canonicalString = canonicalizeEventData({
        id: event.id,
        sequence: event.sequence,
        timestamp: event.timestamp.toISOString(),
        actorUserId: event.actorUserId,
        actionType: event.actionType,
        documentId: event.documentId,
        targetUserId: event.targetUserId,
        outcome: event.outcome,
        correlationId: event.correlationId,
        metadataJson: event.metadataJson,
        previousHash: event.previousHash,
      });

      const recomputedHash = calculateEventHash(canonicalString);

      if (recomputedHash !== event.currentHash) {
        return {
          isValid: false,
          totalEvents,
          verifiedAt,
          latestHash: events[totalEvents - 1].currentHash,
          brokenAtEventId: event.id,
          brokenSequence: event.sequence,
          brokenIndex: i,
          reason: `Cryptographic hash mismatch at sequence ${event.sequence} (ID: ${event.id}): stored hash ${event.currentHash} does not match recomputed hash ${recomputedHash}`,
        };
      }

      expectedPreviousHash = event.currentHash;
    }

    return {
      isValid: true,
      totalEvents,
      verifiedAt,
      latestHash: events[totalEvents - 1].currentHash,
    };
  }

  /**
   * Generates a signed checkpoint summary of the current audit state
   * that can be exported or committed to an external immutable ledger or storage.
   */
  static async generateCheckpoint(secret: string): Promise<{
    checkpointHash: string;
    totalEvents: number;
    timestamp: string;
    signature: string;
  }> {
    const verification = await this.verifyChain();
    const timestamp = new Date().toISOString();
    const payload = `${verification.latestHash}:${verification.totalEvents}:${timestamp}`;
    const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");

    return {
      checkpointHash: verification.latestHash,
      totalEvents: verification.totalEvents,
      timestamp,
      signature,
    };
  }
}
