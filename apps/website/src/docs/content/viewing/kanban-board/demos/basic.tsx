import { List } from "@chelone/react";
import { KanbanBoard } from "@chelone/react/kanban";

const columns = [
  { id: "draft", label: "Draft" },
  { id: "review", label: "In review" },
  { id: "published", label: "Published" },
];

/** `<KanbanBoard>` lays the posts out in Draft, In review and Published columns, and dragging a card writes its new status. */
export default function KanbanBoardDemo() {
  return (
    <List perPage={12} title={false}>
      <KanbanBoard
        groupSource="status"
        titleSource="title"
        descriptionSource="views"
        columns={columns}
        linkType={false}
      />
    </List>
  );
}
