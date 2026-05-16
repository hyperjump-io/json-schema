import { describe, expect, test } from "vitest";
import { registerSchema, validate, restoreValidator } from "../v1/index.js";


describe("Validator Serialization for high-level API", () => {
  const schemaUri = "schema:high-level-serialization";
  const dialectUri = "https://json-schema.org/v1";

  test("serializes and restores a validator successfully", async () => {
    registerSchema({
      type: "object",
      properties: {
        foo: { type: "string", pattern: "^[a-z]+$" },
        bar: { type: "number", minimum: 10 }
      },
      required: ["foo"]
    }, schemaUri, dialectUri);

    const originalValidator = await validate(schemaUri);

    expect(originalValidator({ foo: "abc", bar: 42 }).valid).toBe(true);
    expect(originalValidator({ foo: "123" }).valid).toBe(false);

    const json = originalValidator.serialize();
    expect(typeof json).toBe("string");

    const restoredValidator = restoreValidator(json);

    expect(restoredValidator({ foo: "abc", bar: 42 }).valid).toBe(true);
    expect(restoredValidator({ foo: "123" }).valid).toBe(false);
  });
});
