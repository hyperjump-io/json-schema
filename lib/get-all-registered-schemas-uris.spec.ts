import { test, expect, describe } from "vitest";
import { registerSchema, getAllRegisteredSchemaUris } from "../draft-07/index.js";


describe("getAllRegisteredSchemaUris function", () => {
  test("should return all registered schema URIs", () => {
    const schemaUris = getAllRegisteredSchemaUris();
    expect(schemaUris).toEqual([
      "http://json-schema.org/draft-07/schema"
    ]);
  });

  test("should return all schemas along with custom registered schemas", () => {
    registerSchema({
      "$id": "http://example.com/custom-schema",
      "$schema": "http://json-schema.org/draft-07/schema#"
    });

    const schemaUris = getAllRegisteredSchemaUris();
    expect(schemaUris).toEqual([
      "http://json-schema.org/draft-07/schema",
      "http://example.com/custom-schema"
    ]);
  });
});
