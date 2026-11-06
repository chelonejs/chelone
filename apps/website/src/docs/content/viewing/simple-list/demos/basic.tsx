import { List, SimpleList } from "@chelone/react";

interface Post {
  id: number;
  title: string;
  views: number;
}

/** `<SimpleList>` turns the ambient list's posts into tappable rows that link to each post's edit page. */
export default function SimpleListDemo() {
  return (
    <List perPage={5}>
      <SimpleList<Post>
        primaryText={(post) => post.title}
        secondaryText={(post) => `${post.views} views`}
      />
    </List>
  );
}
