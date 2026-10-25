# Arrays

| Operation | Applies to | Passes when | Marks |
| --- | --- | --- | --- |
| `{ op: "itemCount", min?: number, max?: number }` | array | the number of items is within the limits | – |
| `{ op: "uniqueItems" }` | array | no two items are equal | – |
| `{ op: "item", index: number, of: Expression }` | array | there's no such item, or it passes | the index, if it passes |
| `{ op: "eachItem", from: number, of: Expression }` | array | every item from `from` on passes | each index it passes |
| `{ op: "eachItem", unevaluated: true, of: Expression }` | array | every item not marked yet passes | each index it passes |
| `{ op: "contains", of: Expression, min: number, max: number \| null }` | array | the number of items that pass is within the limits | each index that passes |
| `{ op: "itemSequence", pattern: ItemPattern }` | array | the items, in order, match the pattern | every index, if it passes |

- `item` and `eachItem` explain their failures. They evaluate items, which
  are children.
- **`itemSequence`** is v1's `itemPattern`. `ItemPattern` is a regular
  expression over item expressions: `{ item: Expression }`,
  `{ sequence: ItemPattern[] }`, `{ either: ItemPattern[] }`, and
  `{ repeat: ItemPattern, min: 0 | 1, max: 1 | null }` for `?`, `*`, and
  `+`. Lowering builds this tree, and the kernel builds the automaton
  `itemPattern` built in `compile` before the kernel.
