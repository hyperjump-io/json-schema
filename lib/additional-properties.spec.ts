import { afterEach, describe, expect, test } from "vitest";
import { registerSchema, unregisterSchema, validate, restoreValidator } from "../draft-2020-12/index.js";
import "../v1/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-06/index.js";
import "../draft-04/index.js";


describe("additionalProperties", () => {
  const schemaUri = "https://test.hyperjump.io/additional-properties";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  describe.each([
    "https://json-schema.org/v1",
    "https://json-schema.org/draft/2020-12/schema",
    "https://json-schema.org/draft/2019-09/schema",
    "http://json-schema.org/draft-07/schema#",
    "http://json-schema.org/draft-06/schema#",
    "http://json-schema.org/draft-04/schema#"
  ])("%s", (dialectId) => {
    test("patternProperties with backreferences", async () => {
      registerSchema({
        $schema: dialectId,
        patternProperties: {
          "^(a)\\1$": {},
          "^(b)\\1$": {}
        },
        additionalProperties: false
      }, schemaUri);

      const validator = await validate(schemaUri);

      expect(validator({ aa: 1 }).valid).to.equal(true);
      expect(validator({ bb: 1 }).valid).to.equal(true);
      expect(validator({ b: 1 }).valid).to.equal(false);
      expect(validator({ ab: 1 }).valid).to.equal(false);
    });

    test("patternProperties with the same named capture in separate patterns", async () => {
      registerSchema({
        $schema: dialectId,
        patternProperties: {
          "^(?<letter>a)\\k<letter>$": {},
          "^(?<letter>b)\\k<letter>$": {}
        },
        additionalProperties: false
      }, schemaUri);

      const validator = await validate(schemaUri);

      expect(validator({ aa: 1, bb: 1 }).valid).to.equal(true);
      expect(validator({ b: 1 }).valid).to.equal(false);
    });

    test("restored validator preserves literal properties and independent backreferences", async () => {
      registerSchema({
        $schema: dialectId,
        properties: { "a.b": {}, "": {} },
        patternProperties: {
          "^(a)\\1$": {},
          "^(b)\\1$": {}
        },
        additionalProperties: false
      }, schemaUri);

      const validator = await validate(schemaUri);
      const restoredValidator = restoreValidator(validator.serialize());

      expect(restoredValidator({ "a.b": 1, "": 1, "aa": 1, "bb": 1 }).valid).to.equal(true);
      expect(restoredValidator({ axb: 1 }).valid).to.equal(false);
      expect(restoredValidator({ b: 1 }).valid).to.equal(false);
      expect(restoredValidator({ ab: 1 }).valid).to.equal(false);
    });
  });

  describe.each([
    "https://json-schema.org/v1",
    "https://json-schema.org/draft/2020-12/schema",
    "https://json-schema.org/draft/2019-09/schema"
  ])("%s", (dialectId) => {
    test("additional properties are validated and marked as evaluated with backreferences", async () => {
      registerSchema({
        $schema: dialectId,
        allOf: [{
          patternProperties: {
            "^(a)\\1$": { type: "number" },
            "^(b)\\1$": { type: "number" }
          },
          additionalProperties: { type: "string" }
        }],
        unevaluatedProperties: false
      }, schemaUri);

      const validator = await validate(schemaUri);

      expect(validator({ aa: 1, bb: 1, b: "additional", other: "additional" }).valid).to.equal(true);
      expect(validator({ b: 1 }).valid).to.equal(false);
      expect(validator({ bb: "invalid" }).valid).to.equal(false);
    });
  });
});
