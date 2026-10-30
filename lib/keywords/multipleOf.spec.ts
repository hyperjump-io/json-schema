import { describe, it, expect, afterEach } from "vitest";
import { registerSchema, unregisterSchema, validate } from "../../draft-2020-12/index.js";


describe("multipleOf", () => {
  const schemaUri = "https://test.hyperjump.io/multipleOf";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  const testCases: [number, number, boolean][] = [
    // Small divisors
    [1e-9, 3e-9, false],
    [1.5e-8, 1e-8, false],
    [1.5e-7, 1e-7, false],
    [3e-9, 1e-9, true],
    [2e-8, 1e-8, true],

    // Large values
    [1e20, 3, false],
    [2 ** 60, 3, false],
    [123456789.1, 0.1, true],
    [1234567890.12, 0.01, true]
  ];

  testCases.forEach(([value, multipleOf, expected]) => {
    it(`${value} with multipleOf ${multipleOf} is ${expected ? "valid" : "invalid"}`, async () => {
      registerSchema({
        $schema: "https://json-schema.org/draft/2020-12/schema",
        multipleOf
      }, schemaUri);

      const output = await validate(schemaUri, value);
      expect(output.valid).to.equal(expected);
    });
  });
});
