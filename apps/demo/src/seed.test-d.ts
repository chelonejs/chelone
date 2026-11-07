import type { LooseRecord } from "@chelone/core";
import type {
  Author,
  Customer,
  Order,
  Place,
  Post,
  Product,
} from "@chelone/demo-data";

// The data provider types every row as a `LooseRecord`. Each seed type must
// stay assignable to it without an index signature. `tsc` checks this file.
function acceptsLooseRecord(_record: LooseRecord): void {}

declare const author: Author;
declare const post: Post;
declare const product: Product;
declare const customer: Customer;
declare const order: Order;
declare const place: Place;

acceptsLooseRecord(author);
acceptsLooseRecord(post);
acceptsLooseRecord(product);
acceptsLooseRecord(customer);
acceptsLooseRecord(order);
acceptsLooseRecord(place);
