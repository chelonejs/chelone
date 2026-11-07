<script setup lang="ts">
/**
 * The dashboard the demo opens on (the `#dashboard` slot in `App.vue`): revenue
 * metrics, sales charts, a sales pivot and the running jobs. The Vue twin of
 * `apps/demo`'s. Everything sales is worked out from the one list of orders by
 * `dashboardStats`, which both demos share, so both dashboards show the same
 * numbers.
 */

import { dashboardStats } from "@chelone/demo-data";
import {
  JobMonitor,
  MetricCard,
  PivotGrid,
  provideListContext,
  provideResourceContext,
  useListController,
  useTranslate,
} from "@chelone/vue";
import { BarChart, DonutChart, TrendChart } from "@chelone/vue/charts";
import { computed } from "vue";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});
const formatMoney = (value: number) => money.format(value);

const translate = useTranslate();
/** A demo string in the current locale, with the English text as its default. */
const t = (key: string, english: string) => translate(key, { _: english });

provideResourceContext("orders");
// 16 orders: one page holds every record the pivot needs.
const list = useListController({
  resource: "orders",
  perPage: 100,
  syncWithLocation: false,
});
provideListContext(list);

const loading = computed(() => list.isPending);
const stats = computed(() => dashboardStats(list.data ?? []));
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-bold tracking-tight">
      {{ t("demo.dashboard.title", "Dashboard") }}
    </h1>

    <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard
        :label="t('demo.dashboard.revenue', 'Revenue')"
        :value="stats.metrics.revenue"
        :format="formatMoney"
        :delta="stats.metrics.revenueDelta"
        :loading="loading"
      />
      <MetricCard
        :label="t('demo.dashboard.orders', 'Orders')"
        :value="stats.metrics.orders"
        :delta="stats.metrics.ordersDelta"
        :loading="loading"
      />
      <MetricCard
        :label="t('demo.dashboard.average_order', 'Average order')"
        :value="stats.metrics.averageOrder"
        :format="formatMoney"
        :delta="stats.metrics.averageOrderDelta"
        :loading="loading"
      />
      <MetricCard
        :label="t('demo.dashboard.pending_orders', 'Pending orders')"
        :value="stats.metrics.pending"
        :loading="loading"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-3">
      <TrendChart
        class="lg:col-span-2"
        :title="t('demo.dashboard.revenue_by_delivery_day', 'Revenue by delivery day')"
        :data="stats.revenueByDay"
        x-field="day"
        y-field="revenue"
        area
        smooth
        :y-tick-formatter="formatMoney"
        :tooltip-formatter="formatMoney"
        :loading="loading"
      />
      <DonutChart
        :title="t('demo.dashboard.orders_by_status', 'Orders by status')"
        :data="stats.ordersByStatus"
        label-field="status"
        value-field="orders"
        :loading="loading"
      />
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <BarChart
        :height="260"
        :title="t('demo.dashboard.revenue_by_status', 'Revenue by status')"
        :data="stats.revenueByStatus"
        x-field="status"
        y-field="revenue"
        :loading="loading"
      />
      <section
        class="flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm"
      >
        <h2 class="px-6 leading-none font-semibold">
          {{ t("demo.dashboard.order_value_by_status_and_slot", "Order value by status and delivery slot") }}
        </h2>
        <div class="px-6">
          <PivotGrid
            row-source="status"
            column-source="slot"
            value-source="total"
            aggregator="sum"
            :format="formatMoney"
          />
        </div>
      </section>
    </div>

    <!-- The seeded jobs are cron jobs: idle, running or failed. -->
    <JobMonitor
      resource="jobs"
      :title="t('demo.dashboard.running_jobs', 'Running jobs')"
      :tabs="['running', 'idle', 'failed']"
      type-source="name"
      created-at-source="last_run_at"
      retry-value="running"
      :cancel-from="['running']"
      cancel-value="idle"
    />
  </div>
</template>
