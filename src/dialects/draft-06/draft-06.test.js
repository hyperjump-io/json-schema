import { describe, test, beforeEach, expect } from "vitest";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { draft06Dialect, draft06DialectUri } from "./index.js";
import { compile as compileSchema } from "../../operations/compile.js";
import { validatorFor } from "../../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfig, JsonSchemaOptions } from "../../json-schema.d.ts"
 * @import { CompiledSchema } from "../../operations/compile.d.ts"
 */

describe("draft-06", () => {
  /** @type (config?: JsonSchemaOptions & { allowRetrieval?: string[]; registry?: SchemaRegistry }) => JsonSchemaConfig */
  const draft06 = ({ registry, ...options } = {}) => jsonSchemaConfig({
    dialects: [draft06Dialect],
    ...options,
    allowRetrieval: [],
    registry
  });

  const $schema = `${draft06DialectUri}#`;
  const uri = "http://example.com/schema";

  /** @type (jsonSchema: JsonSchemaConfig, schema: Json) => Promise<CompiledSchema> */
  const compile = (jsonSchema, schema) => {
    const registry = new SchemaRegistry([{ schema, retrievalUri: uri }]);
    return compileSchema(jsonSchema, uri, { registry });
  };

  /** @type JsonSchemaConfig */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = draft06();
  });

  test("format validates by default", async () => {
    const compiled = await compile(jsonSchema, { $schema, format: "ipv4" });

    expect(validatorFor(compiled)("127.0.0.1")).to.equal(true);
    expect(validatorFor(compiled)("not an ip")).to.equal(false);
  });

  test("format is only an annotation if the config says so", async () => {
    const compiled = await compile(draft06({ validateFormats: false }), { $schema, format: "ipv4" });

    expect(validatorFor(compiled)("not an ip")).to.equal(true);
  });

  test("if, then, and else are unknown keywords, so they're ignored", async () => {
    const compiled = await compile(jsonSchema, { $schema, if: true, then: false });

    expect(validatorFor(compiled)(1)).to.equal(true);
  });
});
