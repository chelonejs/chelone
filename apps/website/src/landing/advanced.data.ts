export interface ChecklistItem {
  title: string;
  description: string;
}

// Every item maps to a shipped capability. Dropped from the original v1 copy:
// auto-generated views (the schema drives validation, not view scaffolding),
// undo (not shipped — mutations are pessimistic/optimistic only), and RBAC UI.
export const advancedItems: ChecklistItem[] = [
  {
    title: "Schema-driven validation",
    description: "Point a resource at a Zod schema and get validation for free",
  },
  {
    title: "Seamless relationships",
    description: "Combine and display data from multiple resources",
  },
  {
    title: "Optimistic UI",
    description: "A snappy, native-app experience, even on slow networks",
  },
  {
    title: "Bulk Actions",
    description: "Select and modify multiple records at once",
  },
  {
    title: "User preferences",
    description: "Automatically saves and restores user settings and filters",
  },
  {
    title: "Fully customizable",
    description: "Modify components directly in your source code",
  },
];
