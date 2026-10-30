# Schemas and keyword groups

A compiled schema is a boolean, or the expressions of its keywords:

```ts
type KernelSchema = boolean | { resource: string; keywords: KeywordGroup[]; copyOf?: Handle };

type KeywordGroup = {
  keywordUri: string;
  location: string;       // the keyword's absolute keyword location
  sources: string[];      // the locations of the siblings it read
  expression: Expression;
};
```

- A schema passes if every keyword group passes. Without plugins or
  annotations, evaluation stops at the first failure.
- **Keyword groups are what plugins and errors see.** An error is reported
  for a keyword, never for an operation inside it. With plugins, the
  optimizer can merge across groups only if it keeps a source map (see
  "Optimizer").
- **Plugins** see a tree of hook calls: each schema and keyword group with
  its result and its parent's state. The calls nest: everything between a
  group's `beforeKeyword` and `afterKeyword` is that group's. Output
  formats depend on it. BASIC's state for a keyword is where its errors
  start in one list, and it cuts the list back there when the keyword
  passes, so two groups' subschemas can't be evaluated interleaved. Within
  a group, the order of its subschemas isn't guaranteed, and output formats
  don't sort their errors.
- **`KeywordInfo`** has the group's `expression`, and what plugins need
  from it, computed once: `explainsFailure`, and `conditions`, the
  locations of the schemas its `cases` apply as conditions, which are
  `SchemaInfo` locations. A copy of a schema shares its infos.
- **Sources** are the siblings a keyword read (`minContains` and
  `maxContains` for `contains`), so lint messages and tools can point at
  every keyword an expression came from. They're in the order the keyword
  declares its siblings, which is how a lint rule tells which one set a
  limit. They don't say which field of an operation each one set; nothing
  has needed more yet.
- **Order.** A group whose expression has an `unevaluated` selector is
  evaluated after the groups that don't, in document order otherwise. This
  replaced `reads: ["evaluated"]` and the ordering in `compile.js`.
- A schema is referred to by its handle (its canonical URI), so schemas can
  refer to each other and to themselves. An optimization can copy a
  schema, under a handle that isn't a URI, with `copyOf`, the handle of
  the schema it copies, which is where it is. Lowering doesn't make
  copies, so a serialized kernel doesn't have any.
- **Versioning.** A serialized compiled schema has `kernel: 1`, the version
  of the kernel its expressions are in. `restore` rejects any other
  version. The version goes up when an operation's meaning changes.
- **What's read.** The kernel's `reads` lists the schemas with a keyword
  group that reads marks (`evaluated`) or the dynamic scope
  (`dynamicScope`), so evaluators and the optimizer know what to track
  without reading every expression. It's derived from the expressions, so
  `restore` works it out again, and adding it didn't change the
  version.
