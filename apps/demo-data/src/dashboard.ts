/**
 * The numbers behind the dashboard's metric cards and charts, worked out from
 * the orders so both demos show the same ones. A cancelled order earns nothing
 * and is left out of every figure.
 */

import type { Order } from "./seed";

export type DashboardMetrics = {
  revenue: number;
  orders: number;
  averageOrder: number;
  pending: number;
  /** Ratios (0.05 is 5%) of the later delivery days against the earlier ones; absent without both. */
  revenueDelta?: number;
  ordersDelta?: number;
  averageOrderDelta?: number;
};

export type DashboardStats = {
  metrics: DashboardMetrics;
  revenueByStatus: { status: string; revenue: number }[];
  ordersByStatus: { status: string; orders: number }[];
  revenueByDay: { day: string; revenue: number }[];
};

function isOrder(value: object): value is Order {
  return (
    "status" in value &&
    typeof value.status === "string" &&
    "total" in value &&
    typeof value.total === "number" &&
    "delivery_at" in value &&
    typeof value.delivery_at === "string"
  );
}

const sum = (orders: readonly Order[]) =>
  orders.reduce((total, order) => total + order.total, 0);

function ratio(later: number, earlier: number): number | undefined {
  return earlier === 0 ? undefined : later / earlier - 1;
}

/**
 * The first and last half of the delivery days. With an odd number of days the
 * middle one sits in neither, so both halves span the same number of days.
 */
function splitByDay(orders: readonly Order[]) {
  const days = [
    ...new Set(orders.map((order) => order.delivery_at.slice(0, 10))),
  ].sort();
  const half = Math.floor(days.length / 2);
  const earlyDays = new Set(days.slice(0, half));
  const lateDays = new Set(days.slice(days.length - half));
  return {
    earlier: orders.filter((o) => earlyDays.has(o.delivery_at.slice(0, 10))),
    later: orders.filter((o) => lateDays.has(o.delivery_at.slice(0, 10))),
  };
}

function deltas(orders: readonly Order[]) {
  const { earlier, later } = splitByDay(orders);
  if (earlier.length === 0) return {};
  const average = (part: readonly Order[]) => sum(part) / part.length;
  return {
    revenueDelta: ratio(sum(later), sum(earlier)),
    ordersDelta: ratio(later.length, earlier.length),
    averageOrderDelta: ratio(average(later), average(earlier)),
  };
}

function tally<TKey>(orders: readonly Order[], key: (order: Order) => TKey) {
  const totals = new Map<TKey, { revenue: number; orders: number }>();
  for (const order of orders) {
    const total = totals.get(key(order)) ?? { revenue: 0, orders: 0 };
    total.revenue += order.total;
    total.orders += 1;
    totals.set(key(order), total);
  }
  return totals;
}

export function dashboardStats(records: readonly object[]): DashboardStats {
  const orders = records
    .filter(isOrder)
    .filter((order) => order.status !== "cancelled");
  const revenue = sum(orders);
  const byStatus = [...tally(orders, (order) => order.status)];
  const byDay = [...tally(orders, (order) => order.delivery_at.slice(0, 10))];

  return {
    metrics: {
      revenue,
      orders: orders.length,
      averageOrder: orders.length === 0 ? 0 : revenue / orders.length,
      pending: orders.filter((order) => order.status === "pending").length,
      ...deltas(orders),
    },
    revenueByStatus: byStatus.map(([status, { revenue }]) => ({
      status,
      revenue,
    })),
    ordersByStatus: byStatus.map(([status, { orders }]) => ({
      status,
      orders,
    })),
    revenueByDay: byDay
      .map(([day, { revenue }]) => ({ day, revenue }))
      .sort((a, b) => a.day.localeCompare(b.day)),
  };
}
