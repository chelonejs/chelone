import { RatingField, RecordContextProvider } from "@chelone/react";

export const mode = "record";

/** `<RatingField>` shows a four-and-a-half-star rating with a review count. */
export default function RatingFieldDemo() {
  return (
    <RecordContextProvider value={{ id: 1, rating: 4.5, reviewCount: 24 }}>
      <RatingField source="rating" allowHalf countSource="reviewCount" />
    </RecordContextProvider>
  );
}
