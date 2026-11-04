// A subpath entry, not part of the barrel: the add-on imports the optional
// `@dnd-kit/vue` and `@dnd-kit/dom` peers, which the main entry must load
// without.
export {
  default as KanbanBoard,
  type KanbanBoardProps,
} from "./components/kanban/kanban-board.vue";
