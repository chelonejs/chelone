export { demoAssistantTools, demoAssistantTransport } from "./assistant";
export { type AuthCache, makeDemoAuthProvider, routeAccess } from "./auth";
export {
  type DashboardMetrics,
  type DashboardStats,
  dashboardStats,
} from "./dashboard";
export { createFakeDeploy, type FakeDeploy } from "./fake-deploy";
export {
  type DemoI18n,
  type DemoMenuKeyKind,
  demoMenuKey,
  makeDemoI18n,
  makeI18n,
} from "./i18n";
export { landingPageDocument } from "./landing-page";
export type {
  Activity,
  ActivityResource,
  ApiKey,
  Approval,
  Author,
  Category,
  Comment,
  Customer,
  DeliveryStatus,
  IntegrationSettings,
  Job,
  Locale,
  Order,
  Page,
  Place,
  Post,
  PostStatus,
  Product,
  Revision,
  Tag,
  Variant,
  Webhook,
  WebhookEndpoint,
} from "./seed";
export {
  categoryChoices,
  channelChoices,
  seedData,
  shippingClassChoices,
  statusChoices,
  tagChoices,
} from "./seed";
export { makeDemoStore } from "./store";
export {
  type StubSupabaseAuthProvider,
  stubSupabaseAuthProvider,
} from "./supabase-auth";
export {
  DEFAULT_ROLE,
  defaultPermissions,
  PERMISSIONS_KEY,
  ROLE_KEY,
  TEAM_RESOURCES,
  TEAM_ROLES,
} from "./team";
export { withTextSearch } from "./text-search";
export { type DemoTourStep, TOUR_ID, tourSteps } from "./tour";
