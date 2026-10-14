import { describe, it, expect, afterEach } from "vitest";
import { registerSchema, unregisterSchema, validate, InvalidSchemaError } from "../draft-2020-12/index.js";


describe("Meta-validation", () => {
  const schemaUri = "https://test.hyperjump.io/invalid-schema";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  it("rejects an invalid schema every time it's validated", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: []
    }, schemaUri);

    await expect(validate(schemaUri, 1)).rejects.to.be.instanceof(InvalidSchemaError);
    await expect(validate(schemaUri, 1)).rejects.to.be.instanceof(InvalidSchemaError);
  });

  it("rejects an invalid schema after a failed compile", async () => {
    registerSchema({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: 5
    }, schemaUri);

    await expect(validate(schemaUri)).rejects.to.be.instanceof(InvalidSchemaError);
    await expect(validate(schemaUri, 1)).rejects.to.be.instanceof(InvalidSchemaError);
  });
});
