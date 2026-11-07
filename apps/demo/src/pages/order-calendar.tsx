/** The orders on a calendar by delivery date, coloured by status. */

import { CalendarList, List, ResourceContextProvider } from "@chelone/react";

export const title = "Delivery calendar";
export const group = "Orders";

const statusColors = {
  pending: "#b45309",
  shipped: "#0f766e",
  delivered: "#15803d",
  cancelled: "#6b7280",
};

export default function OrderCalendar() {
  // A page is no <Resource> route, and <List resource> does not set the context its header reads.
  return (
    <ResourceContextProvider value="orders">
      <List title="Delivery calendar" actions={false}>
        <CalendarList
          startSource="delivery_at"
          titleSource="reference"
          colorSource="status"
          colorMap={statusColors}
          // The in-memory data provider matches filters by equality, so it cannot
          // honour the default `delivery_at_gte` / `_lte` range. A real backend
          // gets the default and fetches one month at a time.
          rangeFilter={() => ({})}
        />
      </List>
    </ResourceContextProvider>
  );
}
