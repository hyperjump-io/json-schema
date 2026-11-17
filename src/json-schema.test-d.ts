import { jsonSchemaConfig, extendDialect } from "./json-schema.js";
import type { JsonSchemaConfig, SchemaTypeOf } from "./json-schema.d.ts";
import type { Keyword } from "./keyword.d.ts";
import { SchemaRegistry } from "./registry/schema-registry.js";
import { v1Dialect } from "./dialects/v1/index.js";
import type { V1Schema } from "./dialects/v1/index.d.ts";
import { draft202012Dialect } from "./dialects/draft-2020-12/index.js";
import type { Draft202012Schema } from "./dialects/draft-2020-12/index.d.ts";
import idKeyword from "./keywords/id.js";
import { bundle } from "./operations/bundle.js";
import type { Format } from "./format.d.ts";
import type { BasicOutput } from "./output/output-format.d.ts";
import { BASIC } from "./output/index.js";
import { compile, restore, serialize } from "./operations/compile.js";
import { annotate, validate, validator } from "./operations/validate.js";
import { annotatorFor, validatorFor } from "./operations/validate-compiled.js";
import { browse } from "./session.js";
import { isSchemaDocument, isSchemaNode } from "./schema/schema-nodes.js";
import { jrefMediaType, jrefSelect, Hyperjump } from "@hyperjump/browser";
import type { DocumentNode, FollowedNode, JrefNode, JsonNode, MediaTypePlugin } from "@hyperjump/browser";
import type { JsonSchemaNode } from "./schema/schema-ast.d.ts";

// What's only read can be readonly
const instance = { tags: ["a", "b"], nested: { list: [1, 2] } } as const;

declare const jsonSchema: JsonSchemaConfig;
await validate(jsonSchema, "https://example.com/schema", instance);
await annotate(jsonSchema, "https://example.com/schema", instance);

const compiled = await compile(jsonSchema, "https://example.com/schema");
validatorFor(compiled)(instance);
annotatorFor(compiled)(instance);
restore(jsonSchema, Object.freeze(serialize(compiled)));

// The result's type comes from the output format
const valid: boolean = await validate(jsonSchema, "https://example.com/schema", instance);
const basic: BasicOutput = await validate(jsonSchema, "https://example.com/schema", instance, { output: BASIC });

// The instance's type comes from the input
await validate(jsonSchema, "https://example.com/schema", "{}", { input: "json" });
// @ts-expect-error
await validate(jsonSchema, "https://example.com/schema", instance, { input: "json" });
const check = await validator(jsonSchema, "https://example.com/schema", { input: "json", output: BASIC });
const errors: BasicOutput["errors"] = check("[]").errors;

// A schema can be a value
await validate(jsonSchema, { $schema: "https://json-schema.org/v1", type: "string" }, "foo");
await validate(jsonSchema, true, "foo");

void [valid, basic, errors];

// A format gets the instance, so it can't change it
({
  uri: "https://example.com/format/pair",
  validate: (value) => {
    // @ts-expect-error
    (value as readonly unknown[]).push(1);
    return Array.isArray(value) && value.length === 2;
  }
}) satisfies Format;

// Schema types from the config

// A config's schema type is its media types' dialects'
const v1Only = jsonSchemaConfig({ dialects: [v1Dialect] });
v1Only satisfies JsonSchemaConfig<V1Schema>;
const v1Schema: SchemaTypeOf<typeof v1Only> = { $schema: "https://json-schema.org/v1", type: "string" };

await validate(v1Only, { $schema: "https://json-schema.org/v1", type: "string", minLength: 1 }, "foo");
// @ts-expect-error
await validate(v1Only, { $schema: "https://json-schema.org/v1", minLenght: 1 }, "foo");
// @ts-expect-error
await validator(v1Only, { type: "strin" });
// @ts-expect-error
await compile(v1Only, { minLength: "1" });
// @ts-expect-error
await bundle(v1Only, { minLenght: 1 });

// A URI isn't checked
await validate(v1Only, "https://example.com/schema", "foo");

// An operation takes a config, not a session
// @ts-expect-error
await validate(new Hyperjump(v1Only), "https://example.com/schema", "foo");

// A union of dialects is told apart by `$schema`
const both = jsonSchemaConfig({ dialects: [v1Dialect, draft202012Dialect] });
both satisfies JsonSchemaConfig<V1Schema | Draft202012Schema>;
await validate(both, { $schema: "https://json-schema.org/draft/2020-12/schema", unknown: 1 }, "foo");
// @ts-expect-error
await validate(both, { $schema: "https://json-schema.org/v1", unknown: 1 }, "foo");

// extendDialect keeps the types of the keywords it adds
const evenKeyword = {
  uri: "https://example.com/keyword/even",
  shape: "data",
  lower: (even: boolean) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
} satisfies Keyword<boolean>;
const withEven = jsonSchemaConfig({
  dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })]
});
withEven satisfies JsonSchemaConfig<V1Schema<{ even: typeof evenKeyword }>>;
await validate(withEven, { type: "integer", even: true }, 2);
// @ts-expect-error
await validate(withEven, { type: "integer", even: 2 }, 2);

// A dialect written in the config, with a keyword named by URI that
// allows any value
const custom = jsonSchemaConfig({
  dialects: [{
    uri: "https://example.com/dialect",
    keywords: { $id: "https://json-schema.org/keyword/id", even: evenKeyword },
    unknownKeywords: "error"
  }],
  keywords: [idKeyword]
});
await validate(custom, { $schema: "https://example.com/dialect", $id: 42, even: true }, 2);
// @ts-expect-error
await validate(custom, { other: 1 }, 2);

// Without dialects, any schema
const none = jsonSchemaConfig();
await validate(none, { anything: [1] }, 2);
await validate(none, true, 2);

// A registry can take the config's schemas
new SchemaRegistry<SchemaTypeOf<typeof v1Only>>().with(v1Schema);
// @ts-expect-error
new SchemaRegistry<SchemaTypeOf<typeof v1Only>>().with({ minLenght: 1 });

// The config takes a registry of any type
(jsonSchemaConfig({
  dialects: [v1Dialect],
  registry: new SchemaRegistry<V1Schema>().with({ type: "string" })
})) satisfies JsonSchemaConfig;
(jsonSchemaConfig({
  dialects: [v1Dialect],
  registry: new SchemaRegistry().with({ anything: [1] })
})) satisfies JsonSchemaConfig;

// A config has to have the JSON Schema media types
// @ts-expect-error
await validate({}, "https://example.com/schema", 42);

// What a session finds is a target whose node is of a document in one of
// its media types:
// a schema, JSON, or another one in the config, like JRef
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const yes = <T extends true>(_is?: T) => {};

const found = await browse(new Hyperjump(v1Only), "https://example.com/schema");
yes<Equal<typeof found.node, FollowedNode<JsonSchemaNode | JsonNode>>>();
if (found.node.type === "json-schema") {
  found.node satisfies FollowedNode<JsonSchemaNode>;
  const selected = await jrefSelect(new Hyperjump(v1Only), "> [key=properties]", found);
  yes<Equal<NonNullable<typeof selected>["node"], FollowedNode<JsonSchemaNode | JsonNode>>>();
}

type OtherNode = JsonNode<{ type: "other" }>;
declare const otherMediaType: MediaTypePlugin<DocumentNode<OtherNode>>;
const withOther = jsonSchemaConfig({ dialects: [v1Dialect], mediaTypes: [jrefMediaType, otherMediaType] });
const foundOther = await browse(new Hyperjump(withOther), "https://example.com/schema");
yes<Equal<typeof foundOther.node, FollowedNode<JsonSchemaNode | JsonNode | JrefNode | OtherNode>>>();

// A session whose type doesn't say its media types could have any
const unknownNode = await browse(new Hyperjump(jsonSchema), "https://example.com/schema");
yes<Equal<typeof unknownNode.node, unknown>>();
if (isSchemaNode(unknownNode.node)) {
  unknownNode.node.dialectUri satisfies string;
}
const anyDocument = (await browse(new Hyperjump(jsonSchema), "https://example.com/schema", { reference: "manual" })).document;
if (isSchemaDocument(anyDocument)) {
  anyDocument.anchors satisfies Record<string, string>;
}
