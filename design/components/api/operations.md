# Operations

Part of [The API as functions](README.md). Decided 2026-10-29, not built.

```ts
type Context = JsonSchema | JsonSchemaSession;
type SchemaSource = string /* a URI */ | boolean | SchemaObject;

function validate<R = boolean>(context: Context, schema: SchemaSource, instance: unknown, options?: ValidationOptions<R>): Promise<R>;
function validator<R = boolean>(context: Context, schema: SchemaSource, options?: ValidationOptions<R>): Promise<(instance: unknown) => R>;
function annotate<R = boolean>(context: Context, schema: SchemaSource, instance: unknown, options?: ValidationOptions<R>): Promise<AnnotationResult<R>>;
function annotator<R = boolean>(context: Context, schema: SchemaSource, options?: ValidationOptions<R>): Promise<(instance: unknown) => AnnotationResult<R>>;

function compile(context: Context, schema: SchemaSource, options?: SessionOptions): Promise<CompiledSchema>;
function serialize(compiled: CompiledSchema): Json;  // the Kernel, as lowered
function restore(jsonSchema: JsonSchema, serialized: ReadonlyJson, options?: RestoreOptions): CompiledSchema;

function bundle(context: Context, schema: SchemaSource, options?: SessionOptions & BundleOptions): Promise<Json>;
function lint(context: Context, uri: string, options?: SessionOptions & LintOptions): Promise<SchemaMessage[]>;

type ValidationOptions<R> = SessionOptions & {
  input?: "value" | "json" | "node";  // default "value"
  output?: OutputFormat<R>;           // default FLAG
  plugins?: EvaluationPlugin[];
};
```

The overloads give `instance` its type from `input`: a value, JSON text,
or a `JsonNode`. The signatures above are a sketch. The `.d.ts` files are
the source of truth once they're written.

## Context

- Given a `JsonSchema`, an operation creates a session for the call. Given
  a session, it uses it, so several operations share its retrievals and
  documents.
- `JsonSchemaSession` keeps what's about documents and dialects: `get`,
  `getDocument`, `getDialect`, `hasDialect`, and `annotation`. Its
  `compile`, `bundle`, and `lint` methods are removed, so there's one way
  to do each.

## Validators

- `validator` and `annotator` compile and return a function, so the
  simple path doesn't need a step for the compiled schema. The output
  format and plugins are set when it's made, so the evaluator for them is
  chosen once.
- `compile`, `serialize`, and `restore` are for keeping a compiled schema.
  A `CompiledSchema` is opaque. A function to get a validator from one is
  part of building this (`validatorFor` was the working name).
- Instances come in three forms, chosen with `input`, not three functions
  for each operation. A JSON string is also a valid instance, so the form
  can't be detected, which is why there were `validateJson` and
  `annotateJson`. Rejected: separate functions (`validateJson`,
  `jsonValidator`, …), twelve names; methods on the returned function
  (`check.json(text)`), which leaves the one-off calls without the other
  forms. Splitting them saves little in a bundle, because the JSON parser
  is loaded to read schemas anyway.

## Output formats are values

- A format is imported from `@hyperjump/json-schema/output` (`FLAG`,
  `BASIC`, `DETAILED`) and passed as `output`. Its type is its result type,
  so the `OutputFormats` interface and its declaration merging are
  removed, along with `addOutputFormat` and `getOutputFormat`. A custom
  format is another value of the same type.
- Without `output`, the result is FLAG, so code that only uses FLAG never
  loads the instrumented evaluator or the error messages.
- The CLI chooses a format by name, so it has its own map from names to
  formats.
- Rejected: names registered on the instance, as before. Every registered
  format stays in a bundle, and a custom one needs declaration merging for
  its type.

## Schemas passed as values

- A schema passed as a value is put in a registry made for that call's
  session, next to the call's `registry`.
- One without an `$id` is identified by a new `urn:uuid:` URI. That's what
  its relative references resolve against, and it's in the output's
  `absoluteKeywordLocation`. Rejected: a counter
  (`urn:hyperjump:anonymous-1`), which is easier to read but repeats
  between processes; one fixed URN, which can't tell two schemas apart;
  requiring an `$id`, which makes the simple path longer.
- One with an `$id` that the call's registry or the instance's registry
  also has is an error, even if they're identical. Rejected: allowing
  identical ones, like a session does (see [Schema AST](../../specs/schema-ast.md)),
  and the value replacing the registry's schema, which is the override the
  session rule prevents.
- Nothing is cached. Each `validate(jsonSchema, schema, data)` compiles,
  and code that validates many instances uses `validator` once. The docs
  have to say so. Rejected: caching by the object, which a caller can
  change afterward, the reason a registry stringifies values (see
  [Registries](../registries/README.md)); caching by JSON text, which costs
  a stringify for every call. Any cache would also have to be keyed by the
  registry, because the same schema's references can find different
  schemas with a different one.
