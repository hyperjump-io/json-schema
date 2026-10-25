# Values of any type

| Operation | Applies to | Passes when |
| --- | --- | --- |
| `{ op: "typeIs", types: TypeName[] }` | everything | the instance is one of `types` (`integer` included) |
| `{ op: "equals", value: Json }` | everything | the instance equals `value` (`1` equals `1.0`) |
| `{ op: "oneOfValues", values: Json[] }` | everything | the instance equals one of `values` |
