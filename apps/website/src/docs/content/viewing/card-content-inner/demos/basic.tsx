import { CardContentInner } from "@chelone/react";
import { Card } from "@/components/ui/card";

/** `<CardContentInner>` stacks two sections inside a card without doubling their padding. */
export default function CardContentInnerDemo() {
  return (
    <Card className="w-full">
      <CardContentInner>
        <h3 className="font-semibold">On Computable Numbers</h3>
      </CardContentInner>
      <CardContentInner>
        <p className="text-sm text-muted-foreground">A post by Alan Turing.</p>
      </CardContentInner>
    </Card>
  );
}
