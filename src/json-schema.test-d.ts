import { JsonSchema } from "./json-schema.js";
import type { Validator } from "./json-schema.d.ts";
import type { Format } from "./format.d.ts";

// What's only read can be readonly
const instance = { tags: ["a", "b"], nested: { list: [1, 2] } } as const;

declare const jsonSchema: JsonSchema;
await jsonSchema.validate("https://example.com/schema", instance);
await jsonSchema.annotate("https://example.com/schema", instance);

declare const validator: Validator;
validator.validate(instance);
validator.annotate(instance);
jsonSchema.restoreValidator(Object.freeze(validator.serialize()));

// A format gets the instance, so it can't change it
({
  uri: "https://example.com/format/pair",
  validate: (value) => {
    // @ts-expect-error
    (value as readonly unknown[]).push(1);
    return Array.isArray(value) && value.length === 2;
  }
}) satisfies Format;
