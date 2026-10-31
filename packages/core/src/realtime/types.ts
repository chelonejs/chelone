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
  | "unlocked";

/**
 * What an event carries depends on its type and topic: `ids` on a resource
 * topic, `id` plus `data` or `previousData` on a record topic, `lock` on a
 * lock topic.
 */
export interface RealtimeEventPayload {
  ids?: Identifier[];
  id?: Identifier;
  data?: unknown;
  previousData?: unknown;
  lock?: Lock;
  [key: string]: unknown;
}

export interface RealtimeEvent {
  type: RealtimeEventType;
  payload: RealtimeEventPayload;
  /** ISO timestamp, set by the transport when it has one. */
  date?: string;
}

export type SubscriptionCallback = (event: RealtimeEvent) => void;

export interface Lock {
  resource: string;
  recordId: Identifier;
  /** Who holds the lock. */
  identity: string;
  createdAt: string;
}

export interface LockParams {
  id: Identifier;
  identity: string;
  meta?: unknown;
}

export interface UnlockParams {
  id: Identifier;
  identity: string;
  meta?: unknown;
}

export interface GetLockParams {
  id: Identifier;
  meta?: unknown;
}

export interface GetLocksParams {
  meta?: unknown;
}

/** Rejected by `lock()` when another identity already holds the record. */
export class LockConflictError extends Error {
  override readonly name = "LockConflictError";
  readonly kind = "lock-conflict" as const;
  readonly existingLock: Lock;

  constructor(existingLock: Lock) {
    super(`Record is locked by ${existingLock.identity}`);
    this.existingLock = existingLock;
  }
}

export type RealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected";

export type RealtimeTransportError = Error;

/**
 * The wire under a realtime data provider. Only `subscribe` and `publish` are
 * required; the rest let a status hook read and follow the connection.
 */
export interface RealtimeTransport {
  subscribe(
    topic: string,
    callback: SubscriptionCallback,
  ): Unsubscribe | Promise<Unsubscribe>;
  publish(topic: string, event: RealtimeEvent): void | Promise<void>;
  onReconnect?(callback: () => void): Unsubscribe;
  onStatusChange?(
    callback: (status: RealtimeConnectionStatus) => void,
  ): Unsubscribe;
  getStatus?(): RealtimeConnectionStatus;
  onError?(callback: (error: RealtimeTransportError) => void): Unsubscribe;
}

export interface LockProvider {
  lock(resource: string, params: LockParams): Promise<{ data: Lock }>;
  unlock(resource: string, params: UnlockParams): Promise<{ data: Lock }>;
  getLock(
    resource: string,
    params: GetLockParams,
  ): Promise<{ data: Lock | null }>;
  getLocks(resource: string, params: GetLocksParams): Promise<{ data: Lock[] }>;
}

export interface RealtimeDataProvider<
  TResources extends ResourceMap = ResourceMap,
> extends DataProvider<TResources>,
    LockProvider {
  subscribe(
    topic: string,
    callback: SubscriptionCallback,
  ): Promise<Unsubscribe>;
  publish(topic: string, event: RealtimeEvent): Promise<void>;
  onReconnect?: RealtimeTransport["onReconnect"];
  onStatusChange?: RealtimeTransport["onStatusChange"];
  getStatus?: RealtimeTransport["getStatus"];
  onError?: RealtimeTransport["onError"];
}

export interface RealtimeDataProviderOptions {
  locks?: LockProvider;
}
