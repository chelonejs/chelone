// A subpath entry, not part of the barrel: the add-on imports the optional
// `@dnd-kit/react` peer, which the main entry must load without.
export {
  KanbanBoard,
  type KanbanBoardProps,
} from "./components/kanban/kanban-board";
