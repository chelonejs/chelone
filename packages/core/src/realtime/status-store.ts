import { createMicroStore, type MicroStore } from "../store/micro-store";
import type {
  RealtimeConnectionStatus,
  RealtimeDataProvider,
  RealtimeTransportError,
} from "./types";

export interface RealtimeStatusState {
  status: RealtimeConnectionStatus;
  /** The latest transport error; cleared when the status becomes `"connected"`. */
  lastError: RealtimeTransportError | null;
}

type StatusSource = Pick<
  RealtimeDataProvider,
  "getStatus" | "onStatusChange" | "onError"
>;

function readStatus(source: StatusSource): RealtimeConnectionStatus {
  if (source.getStatus) return source.getStatus();
  // A transport that announces changes but cannot be asked has not told us yet.
  return source.onStatusChange ? "disconnected" : "idle";
}

/** Follows the connection while it has a subscriber, and lets go of it at zero. */
export function createRealtimeStatusStore(
  source: StatusSource,
): MicroStore<RealtimeStatusState> {
  const store: MicroStore<RealtimeStatusState> =
    createMicroStore<RealtimeStatusState>(
      { status: readStatus(source), lastError: null },
      {
        onSubscribed() {
          // The transport may have moved on while nobody was listening.
          const status = readStatus(source);
          store.setState(
            status === "connected" ? { status, lastError: null } : { status },
          );
          const stops = [
            source.onStatusChange?.((status) =>
              store.setState(
                status === "connected"
                  ? { status, lastError: null }
                  : { status },
              ),
            ),
            source.onError?.((lastError) => store.setState({ lastError })),
          ];
          return () => {
            for (const stop of stops) stop?.();
          };
        },
      },
    );
  return store;
}
