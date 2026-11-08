import type { DataProvider } from "../data/types";
import type { Identifier } from "../resource/identifier";
import type { ResourceMap } from "../resource/registry";
import type { Unsubscribe } from "../router/port";

export type { Unsubscribe };

export type RealtimeEventType =
  | "created"
  | "updated"
  | "deleted"
  | "locked"
  | "unlocked"
  // Open to custom types, while keeping the known ones in editor completion.
  | (string & {});

export interface RealtimeEvent<P = unknown> {
  topic: string;
  type: RealtimeEventType;
  payload: P;
  meta?: Record<string, unknown>;
}

export type SubscriptionCallback<P = unknown> = (
  event: RealtimeEvent<P>,
) => void;

export interface Lock {
  resource: string;
  recordId: Identifier;
  /** Who holds the lock. */
  identity: Identifier;
  createdAt: string;
}

export interface LockParams {
  id: Identifier;
  identity: Identifier;
  meta?: Record<string, unknown>;
}

export interface UnlockParams {
  id: Identifier;
  identity: Identifier;
  meta?: Record<string, unknown>;
}

export interface GetLockParams {
  id: Identifier;
  meta?: Record<string, unknown>;
}

export interface GetLocksParams {
  meta?: Record<string, unknown>;
}

/** Rejected by `lock()` when another identity already holds the record. */
export class LockConflictError extends Error {
  readonly kind = "LockConflictError" as const;
  readonly existingLock: Lock;

  constructor(existingLock: Lock) {
    super(
      `Resource ${existingLock.resource}/${String(existingLock.recordId)} is locked by ${String(existingLock.identity)}`,
    );
    this.existingLock = existingLock;
  }
}

export type RealtimeConnectionStatus =
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "idle";

export type RealtimeTransportErrorKind =
  | "connect_failed"
  | "auth_failed"
  | "send_failed"
  | "parse_failed"
  | "handler_threw";

export interface RealtimeTransportError {
  kind: RealtimeTransportErrorKind;
  topic?: string;
  cause?: unknown;
  /** Whether the transport will try again on its own. */
  retrying: boolean;
}

/**
 * The wire under a realtime data provider. Only `subscribe` and `publish` are
 * required; the rest let a status hook read and follow the connection.
 */
export interface RealtimeTransport {
  subscribe<P = unknown>(
    topic: string,
    callback: SubscriptionCallback<P>,
  ): Unsubscribe;
  publish<P = unknown>(
    topic: string,
    event: Omit<RealtimeEvent<P>, "topic">,
  ): Promise<void>;
  onReconnect?(callback: () => void): Unsubscribe;
  onStatusChange?(
    callback: (status: RealtimeConnectionStatus) => void,
  ): Unsubscribe;
  getStatus?(): RealtimeConnectionStatus;
  onError?(callback: (error: RealtimeTransportError) => void): Unsubscribe;
}

export interface LockProvider<TResources extends ResourceMap = ResourceMap> {
  lock<TName extends keyof TResources & string>(
    resource: TName,
    params: LockParams,
  ): Promise<Lock>;
  unlock<TName extends keyof TResources & string>(
    resource: TName,
    params: UnlockParams,
  ): Promise<Lock>;
  getLock<TName extends keyof TResources & string>(
    resource: TName,
    params: GetLockParams,
  ): Promise<Lock | null>;
  getLocks<TName extends keyof TResources & string>(
    resource: TName,
    params?: GetLocksParams,
  ): Promise<Lock[]>;
}

export interface RealtimeDataProvider<
  TResources extends ResourceMap = ResourceMap,
> extends DataProvider<TResources>,
    LockProvider<TResources> {
  subscribe<P = unknown>(
    topic: string,
    callback: SubscriptionCallback<P>,
  ): Unsubscribe;
  publish<P = unknown>(
    topic: string,
    event: Omit<RealtimeEvent<P>, "topic">,
  ): Promise<void>;
  onReconnect?: RealtimeTransport["onReconnect"];
  onStatusChange?: RealtimeTransport["onStatusChange"];
  getStatus?: RealtimeTransport["getStatus"];
  onError?: RealtimeTransport["onError"];
}

export interface RealtimeDataProviderOptions {
  locks?: LockProvider;
}
