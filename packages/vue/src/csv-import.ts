// A subpath entry, not part of the barrel: the add-on imports the optional
// `papaparse` peer, which the main entry must load without.
export {
  type CsvImportProps,
  default as CsvImport,
} from "./components/admin/csv-import/csv-import.vue";
export { useCsvImport } from "./components/admin/csv-import/use-csv-import";
