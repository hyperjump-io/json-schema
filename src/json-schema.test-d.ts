import { JsonSchema } from "./json-schema.js";
import type { Format } from "./format.d.ts";
import type { BasicOutput } from "./output/output-format.d.ts";
import { BASIC } from "./output/index.js";
import { compile, restore, serialize } from "./operations/compile.js";
import { annotate, annotatorFor, validate, validator, validatorFor } from "./operations/validate.js";

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
