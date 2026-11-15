import { describe, test, expect } from "vitest";
import { jsonSchemaMediaTypes, SchemaError, toVFileMessage } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { compile } from "../operations/compile.js";

describe("SchemaError", () => {
  test("its message describes the first problem", async () => {
    const error = await schemaError(`{ "$schema": "${v1DialectUri}", "$id": "https://example.com/bad", "minLength": -1 }`);

    expect(error.message).to.equal("The schema at 'https://example.com/bad' is invalid: Expected a non-negative integer");
  });

  test("its message counts the other problems", async () => {
    const error = await schemaError(`{ "$schema": "${v1DialectUri}", "$id": "https://example.com/bad", "minLength": -1, "maxLength": -1 }`);

    expect(error.messages).to.have.length(2);
    expect(error.message).to.equal("The schema at 'https://example.com/bad' is invalid: Expected a non-negative integer (and 1 more problem)");
  });

  test("a problem converts to a VFileMessage", async () => {
    const error = await schemaError(`{
  "$schema": "${v1DialectUri}",
  "$id": "https://example.com/bad",
  "minLength": -1
}`);
    const message = toVFileMessage(error.messages[0]);

    expect(String(message)).to.equal("4:16-4:18: Expected a non-negative integer");
    expect(message).to.include({
      ruleId: "https://json-schema.org/keyword/minLength",
      source: "json-schema",
      file: "https://example.com/bad",
      fatal: true
    });
  });
});

/** @type (schema: string) => Promise<SchemaError> */
const schemaError = async (schema) => {
  const jsonSchema = {
    mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect] }),
    registry: new SchemaRegistry().with(schema)
  };

  try {
    await compile(jsonSchema, "https://example.com/bad");
  } catch (error) {
    if (error instanceof SchemaError) {
      return error;
    }
    throw error;
  }
  throw Error("Expected a SchemaError");
};
