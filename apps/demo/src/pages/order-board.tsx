/**
 * The orders as a board: one column per status, and a drag (or a card's
 * "Move to" menu) writes the new status. The status button on each card moves
 * an order along the workflow, which is narrower than the board: it offers
 * only the next states, while a drag can put a card in any column.
 *
 * The fields are `createResourceComponents("orders")`'s, so each `source` is
 * checked against `orderSchema`. `<KanbanBoard>` is an add-on and stays a plain
 * import: the factory returns views, fields and inputs, and the board hands the
 * card its record, which the fields take as a loose record.
 */

import { statusChoices } from "@chelone/demo-data";
import {
  createResourceComponents,
  ResourceContextProvider,
  StatusTransitionButton,
} from "@chelone/react";
import { KanbanBoard } from "@chelone/react/kanban";

export const title = "Order board";
export const group = "Orders";

const orders = createResourceComponents("orders");

const columns = statusChoices.map(({ id, name }) => ({ id, label: name }));
const labels = Object.fromEntries(
  statusChoices.map(({ id, name }) => [id, name]),
);
const transitions = {
  pending: ["shipped", "cancelled"],
  shipped: ["delivered", "cancelled"],
  delivered: [],
  cancelled: ["pending"],
};

export default function OrderBoard() {
  // A page is no <Resource> route, and <List resource> does not set the context its header reads.
  return (
    <ResourceContextProvider value="orders">
      <orders.List title="Order board" perPage={100} actions={false}>
        <KanbanBoard
          groupSource="status"
          titleSource="reference"
          columns={columns}
          cardRenderer={(order) => (
            <>
              <orders.TextField
                source="reference"
                record={order}
                className="font-medium"
              />
              <span className="text-muted-foreground">
                <orders.NumberField
                  source="total"
                  record={order}
                  options={{ style: "currency", currency: "USD" }}
                />
                {" · "}
                <orders.DateField source="delivery_at" record={order} />
              </span>
              {/* The menu is portalled, but React events still bubble to the card. */}
              {/* biome-ignore lint/a11y/noStaticElementInteractions: only stops the menu's events reaching the card */}
              <div
                className="pt-1"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <StatusTransitionButton
                  record={order}
                  resource="orders"
                  transitions={transitions}
                  labels={labels}
                  mutationMode="optimistic"
                  className="h-7 px-2 text-xs"
                />
              </div>
            </>
          )}
        />
      </orders.List>
    </ResourceContextProvider>
  );
}
