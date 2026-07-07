import { Edit, ShowButton, TextInput, Toolbar } from "@chelone/react";

/** A customized `<Edit>`: an explicit `title` string, a header `actions` slot
 *  (here a Show button), and a trimmed set of inputs. */
export default function EditCustomizedDemo() {
  return (
    <Edit id={1} title="Edit post" actions={<ShowButton />}>
      <TextInput source="title" />
      <TextInput source="body" multiline />
      <Toolbar />
    </Edit>
  );
}
