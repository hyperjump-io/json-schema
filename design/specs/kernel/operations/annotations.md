# Annotations

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "annotate", value: Json, types?: TypeName[] }` | `types`, or everything | always |

It annotates `value`, on instances of `types`. Without annotations or
plugins, it does nothing, so the optimizer leaves it out. That replaced the
hand-written list of keywords that always pass.
