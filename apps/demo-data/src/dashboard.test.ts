import { describe, expect, it } from "vitest";
import { dashboardStats } from "./dashboard";

const order = (id: number, status: string, total: number, day: number) => ({
  id,
  reference: `ORD-${id}`,
  customer_id: 1,
  product_id: 1,
  quantity: 1,
  status,
  total,
  delivery_at: `2026-03-${String(day).padStart(2, "0")}T10:00:00.000Z`,
  slot: "09:00",
  handling: "PT30M",
  product_ids: [1],
});

const orders = [
  order(1, "delivered", 100, 1),
  order(2, "shipped", 100, 2),
  order(3, "cancelled", 500, 3),
  order(4, "pending", 150, 4),
  order(5, "delivered", 250, 5),
  order(6, "delivered", 200, 5),
];

describe("dashboard stats", () => {
  it("counts revenue and orders without the cancelled ones", () => {
    const { metrics } = dashboardStats(orders);

    expect(metrics.revenue).toBe(800);
    expect(metrics.orders).toBe(5);
    expect(metrics.averageOrder).toBe(160);
    expect(metrics.pending).toBe(1);
  });

  it("compares the later delivery days with the earlier ones", () => {
    const { metrics } = dashboardStats(orders);

    // days 1-2 earned 200, days 4-5 earned 600
    expect(metrics.revenueDelta).toBe(2);
    expect(metrics.ordersDelta).toBe(0.5);
    expect(metrics.averageOrderDelta).toBe(1);
  });

  it("compares periods of equal length when the number of days is odd", () => {
    const { metrics } = dashboardStats([
      order(1, "delivered", 100, 1),
      order(2, "delivered", 100, 2),
      order(3, "delivered", 100, 3),
    ]);

    expect(metrics.revenueDelta).toBe(0);
    expect(metrics.ordersDelta).toBe(0);
  });

  it("has no change to show with a single day of sales", () => {
    const { metrics } = dashboardStats([order(1, "shipped", 80, 1)]);

    expect(metrics.revenueDelta).toBeUndefined();
    expect(metrics.ordersDelta).toBeUndefined();
  });

  it("groups revenue and order counts by status", () => {
    const { revenueByStatus, ordersByStatus } = dashboardStats(orders);

    expect(revenueByStatus).toEqual([
      { status: "delivered", revenue: 550 },
      { status: "shipped", revenue: 100 },
      { status: "pending", revenue: 150 },
    ]);
    expect(ordersByStatus).toEqual([
      { status: "delivered", orders: 3 },
      { status: "shipped", orders: 1 },
      { status: "pending", orders: 1 },
    ]);
  });

  it("sums revenue per delivery day in date order", () => {
    const { revenueByDay } = dashboardStats([...orders].reverse());

    expect(revenueByDay).toEqual([
      { day: "2026-03-01", revenue: 100 },
      { day: "2026-03-02", revenue: 100 },
      { day: "2026-03-04", revenue: 150 },
      { day: "2026-03-05", revenue: 450 },
    ]);
  });

  it("skips records that are not orders", () => {
    const { metrics } = dashboardStats([{ id: 1, name: "not an order" }]);

    expect(metrics.orders).toBe(0);
    expect(metrics.averageOrder).toBe(0);
  });
});
