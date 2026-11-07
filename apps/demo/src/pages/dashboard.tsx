/**
 * The dashboard the demo opens on (`<Admin.Dashboard>` in `App.tsx`): revenue
 * metrics, sales charts, a sales pivot and the running jobs. Everything sales
 * is worked out from the one list of orders by `dashboardStats`, which the Vue
 * demo shares, so both dashboards show the same numbers.
 */

import { dashboardStats } from "@chelone/demo-data";
import {
  JobMonitor,
  ListContextProvider,
  MetricCard,
  PivotGrid,
  ResourceContextProvider,
  useListController,
  useTranslate,
} from "@chelone/react";
import { BarChart, DonutChart, TrendChart } from "@chelone/react/charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function Dashboard() {
  const translate = useTranslate();
  // 16 orders: one page holds every record the pivot needs.
  const list = useListController("orders", {
    perPage: 100,
    syncWithLocation: false,
  });
  const loading = list.isPending;
  const { metrics, revenueByStatus, ordersByStatus, revenueByDay } =
    dashboardStats(list.data ?? []);

  return (
    <ResourceContextProvider value="orders">
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {translate("demo.dashboard.title", { _: "Dashboard" })}
        </h1>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label={translate("demo.dashboard.revenue", { _: "Revenue" })}
            value={metrics.revenue}
            format={money.format}
            delta={metrics.revenueDelta}
            loading={loading}
          />
          <MetricCard
            label={translate("demo.dashboard.orders", { _: "Orders" })}
            value={metrics.orders}
            delta={metrics.ordersDelta}
            loading={loading}
          />
          <MetricCard
            label={translate("demo.dashboard.average_order", {
              _: "Average order",
            })}
            value={metrics.averageOrder}
            format={money.format}
            delta={metrics.averageOrderDelta}
            loading={loading}
          />
          <MetricCard
            label={translate("demo.dashboard.pending_orders", {
              _: "Pending orders",
            })}
            value={metrics.pending}
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <TrendChart
            className="lg:col-span-2"
            title={translate("demo.dashboard.revenue_by_delivery_day", {
              _: "Revenue by delivery day",
            })}
            data={revenueByDay}
            xField="day"
            yField="revenue"
            area
            smooth
            yTickFormatter={money.format}
            tooltipFormatter={money.format}
            loading={loading}
          />
          <DonutChart
            title={translate("demo.dashboard.orders_by_status", {
              _: "Orders by status",
            })}
            data={ordersByStatus}
            labelField="status"
            valueField="orders"
            loading={loading}
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <BarChart
            height={260}
            title={translate("demo.dashboard.revenue_by_status", {
              _: "Revenue by status",
            })}
            data={revenueByStatus}
            xField="status"
            yField="revenue"
            loading={loading}
          />
          <Card>
            <CardHeader>
              <CardTitle>
                {translate("demo.dashboard.order_value_by_status_and_slot", {
                  _: "Order value by status and delivery slot",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ListContextProvider value={list}>
                <PivotGrid
                  rowSource="status"
                  columnSource="slot"
                  valueSource="total"
                  aggregator="sum"
                  format={money.format}
                />
              </ListContextProvider>
            </CardContent>
          </Card>
        </div>

        {/* The seeded jobs are cron jobs: idle, running or failed. */}
        <JobMonitor
          resource="jobs"
          title={translate("demo.dashboard.running_jobs", {
            _: "Running jobs",
          })}
          tabs={["running", "idle", "failed"]}
          typeSource="name"
          createdAtSource="last_run_at"
          retryValue="running"
          cancelFrom={["running"]}
          cancelValue="idle"
        />
      </div>
    </ResourceContextProvider>
  );
}
