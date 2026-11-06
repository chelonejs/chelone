import { RatingInput } from "@chelone/react";

export const mode = "input";

/** `<RatingInput>` rates a post 4.5 out of 5 stars, half stars clickable. */
export default function RatingInputDemo() {
  return (
    <div className="w-full max-w-xs">
      <RatingInput source="rating" max={5} allowHalf defaultValue={4.5} />
    </div>
  );
}
