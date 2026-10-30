import { JsonSchema, extendDialect } from "./json-schema.js";
import type { SchemaTypeOf } from "./json-schema.d.ts";
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

// What's only read can be readonly
const instance = { tags: ["a", "b"], nested: { list: [1, 2] } } as const;

declare const jsonSchema: JsonSchema;
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

// A JsonSchema's schema type is its dialects'
const v1Only = new JsonSchema({ dialects: [v1Dialect] });
v1Only satisfies JsonSchema<V1Schema>;
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

// A session has its JsonSchema's schema type
// @ts-expect-error
await validate(v1Only.session(), { minLenght: 1 }, "foo");

// A union of dialects is told apart by `$schema`
const both = new JsonSchema({ dialects: [v1Dialect, draft202012Dialect] });
both satisfies JsonSchema<V1Schema | Draft202012Schema>;
await validate(both, { $schema: "https://json-schema.org/draft/2020-12/schema", unknown: 1 }, "foo");
// @ts-expect-error
await validate(both, { $schema: "https://json-schema.org/v1", unknown: 1 }, "foo");

// extendDialect keeps the types of the keywords it adds
const evenKeyword = {
  uri: "https://example.com/keyword/even",
  shape: "data",
  lower: (even: boolean) => even ? { op: "multipleOf", divisor: 2 } : { op: "pass" }
} satisfies Keyword<boolean>;
const withEven = new JsonSchema({ dialects: [extendDialect(v1Dialect, { keywords: { even: evenKeyword } })] });
withEven satisfies JsonSchema<V1Schema<{ even: typeof evenKeyword }>>;
await validate(withEven, { type: "integer", even: true }, 2);
// @ts-expect-error
await validate(withEven, { type: "integer", even: 2 }, 2);

// A dialect written in the config, with a keyword named by URI that
// allows any value
const custom = new JsonSchema({
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
const none = new JsonSchema();
await validate(none, { anything: [1] }, 2);
await validate(none, true, 2);

// A registry can take the JsonSchema's schemas
new SchemaRegistry<SchemaTypeOf<typeof v1Only>>().with(v1Schema);
// @ts-expect-error
new SchemaRegistry<SchemaTypeOf<typeof v1Only>>().with({ minLenght: 1 });

// It can be subclassed
class MyJsonSchema extends JsonSchema {}
new MyJsonSchema({ dialects: [v1Dialect] }) satisfies JsonSchema;

// The instance's registry has the JsonSchema's schema type, and any
// registry can be assigned to it
v1Only.registry = v1Only.registry.with({ $schema: "https://json-schema.org/v1", type: "string" });
// @ts-expect-error
v1Only.registry = v1Only.registry.with({ minLenght: 1 });
v1Only.registry = new SchemaRegistry().with({ anything: [1] });
v1Only.registry = v1Only.registry.concat(new SchemaRegistry());
