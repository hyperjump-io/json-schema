import { afterEach, describe, expect, test } from "vitest";
import { validate, registerSchema, unregisterSchema } from "../stable/index.js";
import { DETAILED } from "./experimental.js";


describe("Detailed Output Format", () => {
  const schemaUri = "schema:main";
  const dialectUri = "https://json-schema.org/validation";

  afterEach(() => {
    unregisterSchema(schemaUri);
  });

  describe("$ref", () => {
    test("invalid", async () => {
      registerSchema({
        $ref: "#/$defs/string",
        $defs: {
          string: { type: "string" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/ref",
            absoluteKeywordLocation: `${schemaUri}#/$ref`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/$defs/string/type`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        $ref: "#/$defs/string",
        $defs: {
          string: { type: "string" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);

      expect(output).to.eql({ valid: true });
    });
  });

  describe("additionalProperties", () => {
    test("invalid", async () => {
      registerSchema({ additionalProperties: false }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/additionalProperties",
            absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/evaluation/validate",
                absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
                instanceLocation: "#/foo"
              }
            ]
          }
        ]
      });
    });

    test("invalid - multiple errors", async () => {
      registerSchema({ additionalProperties: false }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, bar: 24 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/additionalProperties",
            absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/evaluation/validate",
                absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
                instanceLocation: "#/foo"
              },
              {
                keyword: "https://json-schema.org/evaluation/validate",
                absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
                instanceLocation: "#/bar"
              }
            ]
          }
        ]
      });
    });

    test("invalid - schema", async () => {
      registerSchema({
        additionalProperties: { type: "string" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/additionalProperties",
            absoluteKeywordLocation: `${schemaUri}#/additionalProperties`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/additionalProperties/type`,
                instanceLocation: "#/foo"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ additionalProperties: true }, schemaUri, dialectUri);
      const output = await validate(schemaUri, {}, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("allOf", () => {
    test("invalid", async () => {
      registerSchema({
        allOf: [
          { type: "number" },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/allOf",
            absoluteKeywordLocation: `${schemaUri}#/allOf`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/maximum",
                absoluteKeywordLocation: `${schemaUri}#/allOf/1/maximum`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("invalid - multiple errors", async () => {
      registerSchema({
        type: "number",
        allOf: [
          { maximum: 2 },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/allOf",
            absoluteKeywordLocation: `${schemaUri}#/allOf`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/maximum",
                absoluteKeywordLocation: `${schemaUri}#/allOf/0/maximum`,
                instanceLocation: "#"
              },
              {
                keyword: "https://json-schema.org/keyword/maximum",
                absoluteKeywordLocation: `${schemaUri}#/allOf/1/maximum`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        allOf: [
          { type: "number" },
          { maximum: 5 }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 3, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("anyOf", () => {
    test("invalid", async () => {
      registerSchema({
        anyOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, true, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/anyOf",
            absoluteKeywordLocation: `${schemaUri}#/anyOf`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/anyOf/0/type`,
                instanceLocation: "#"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/anyOf/1/type`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        anyOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("oneOf", () => {
    test("invalid", async () => {
      registerSchema({
        oneOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, true, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/oneOf",
            absoluteKeywordLocation: `${schemaUri}#/oneOf`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/oneOf/0/type`,
                instanceLocation: "#"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/oneOf/1/type`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        oneOf: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("not", () => {
    test("invalid", async () => {
      registerSchema({
        not: { type: "number" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/not",
            absoluteKeywordLocation: `${schemaUri}#/not`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        not: { type: "number" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("contains", () => {
    test("invalid", async () => {
      registerSchema({
        contains: { type: "string" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, 2], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/contains",
            absoluteKeywordLocation: `${schemaUri}#/contains`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/contains/type`,
                instanceLocation: "#/0"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/contains/type`,
                instanceLocation: "#/1"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        contains: { type: "string" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, "foo"], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("dependentSchemas", () => {
    test("invalid", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/dependentSchemas",
            absoluteKeywordLocation: `${schemaUri}#/dependentSchemas`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/required",
                absoluteKeywordLocation: `${schemaUri}#/dependentSchemas/foo/required`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("invalid - multiple conditions fail", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] },
          bar: { required: ["b"] }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, bar: 24 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/dependentSchemas",
            absoluteKeywordLocation: `${schemaUri}#/dependentSchemas`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/required",
                absoluteKeywordLocation: `${schemaUri}#/dependentSchemas/foo/required`,
                instanceLocation: "#"
              },
              {
                keyword: "https://json-schema.org/keyword/required",
                absoluteKeywordLocation: `${schemaUri}#/dependentSchemas/bar/required`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        dependentSchemas: {
          foo: { required: ["a"] }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, a: true }, DETAILED);

      expect(output).to.eql({ valid: true });
    });
  });

  describe("then", () => {
    test("invalid", async () => {
      registerSchema({
        if: { type: "string" },
        then: { minLength: 1 }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "", DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/then",
            absoluteKeywordLocation: `${schemaUri}#/then`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/minLength",
                absoluteKeywordLocation: `${schemaUri}#/then/minLength`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        if: { type: "string" },
        then: { minLength: 1 }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("else", () => {
    test("invalid", async () => {
      registerSchema({
        type: ["string", "number"],
        if: { type: "string" },
        else: { minimum: 42 }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 5, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/else",
            absoluteKeywordLocation: `${schemaUri}#/else`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/minimum",
                absoluteKeywordLocation: `${schemaUri}#/else/minimum`,
                instanceLocation: "#"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        type: ["string", "number"],
        if: { type: "string" },
        else: { minimum: 5 }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("items", () => {
    test("invalid", async () => {
      registerSchema({
        items: { type: "string" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [42, 24], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/items",
            absoluteKeywordLocation: `${schemaUri}#/items`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/items/type`,
                instanceLocation: "#/0"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/items/type`,
                instanceLocation: "#/1"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        items: { type: "string" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, ["foo"], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("patternProperties", () => {
    test("invalid", async () => {
      registerSchema({
        patternProperties: {
          "^f": { type: "string" },
          "^b": { type: "number" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, bar: true }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/patternProperties",
            absoluteKeywordLocation: `${schemaUri}#/patternProperties`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/patternProperties/%5Ef/type`,
                instanceLocation: "#/foo"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/patternProperties/%5Eb/type`,
                instanceLocation: "#/bar"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        patternProperties: {
          "^f": { type: "string" },
          "^b": { type: "number" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: "a", bar: 42 }, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("prefixItems", () => {
    test("invalid", async () => {
      registerSchema({
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [42, "foo"], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/prefixItems",
            absoluteKeywordLocation: `${schemaUri}#/prefixItems`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/prefixItems/0/type`,
                instanceLocation: "#/0"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/prefixItems/1/type`,
                instanceLocation: "#/1"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        prefixItems: [
          { type: "string" },
          { type: "number" }
        ]
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, ["foo", 42], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("properties", () => {
    test("invalid", async () => {
      registerSchema({
        properties: {
          foo: { type: "string" },
          bar: { type: "number" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, bar: true }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/properties",
            absoluteKeywordLocation: `${schemaUri}#/properties`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/properties/foo/type`,
                instanceLocation: "#/foo"
              },
              {
                keyword: "https://json-schema.org/keyword/type",
                absoluteKeywordLocation: `${schemaUri}#/properties/bar/type`,
                instanceLocation: "#/bar"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        properties: {
          foo: { type: "string" },
          bar: { type: "number" }
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: "a", bar: 42 }, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("propertyNames", () => {
    test("invalid", async () => {
      registerSchema({
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { banana: true, pear: false }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/propertyNames",
            absoluteKeywordLocation: `${schemaUri}#/propertyNames`,
            instanceLocation: "#",
            errors: [
              {
                keyword: "https://json-schema.org/keyword/pattern",
                absoluteKeywordLocation: `${schemaUri}#/propertyNames/pattern`,
                instanceLocation: "#/banana"
              },
              {
                keyword: "https://json-schema.org/keyword/pattern",
                absoluteKeywordLocation: `${schemaUri}#/propertyNames/pattern`,
                instanceLocation: "#/pear"
              }
            ]
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        propertyNames: { pattern: "^a" }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { apple: true }, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("const", () => {
    test("invalid", async () => {
      registerSchema({ const: "foo" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/const",
            absoluteKeywordLocation: `${schemaUri}#/const`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ const: "foo" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("dependentRequired", () => {
    test("invalid", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"]
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/dependentRequired",
            absoluteKeywordLocation: `${schemaUri}#/dependentRequired`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("invalid - multiple conditions fail", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"],
          bar: ["b"]
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, bar: 24 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/dependentRequired",
            absoluteKeywordLocation: `${schemaUri}#/dependentRequired`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({
        dependentRequired: {
          foo: ["a"]
        }
      }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { foo: 42, a: true }, DETAILED);

      expect(output).to.eql({ valid: true });
    });
  });

  describe("enum", () => {
    test("invalid", async () => {
      registerSchema({ enum: ["foo"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/enum",
            absoluteKeywordLocation: `${schemaUri}#/enum`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ enum: ["foo"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("exclusiveMaximum", () => {
    test("invalid", async () => {
      registerSchema({ exclusiveMaximum: 5 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/exclusiveMaximum",
            absoluteKeywordLocation: `${schemaUri}#/exclusiveMaximum`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ exclusiveMaximum: 42 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 5, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("exclusiveMinimum", () => {
    test("invalid", async () => {
      registerSchema({ exclusiveMinimum: 42 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 5, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/exclusiveMinimum",
            absoluteKeywordLocation: `${schemaUri}#/exclusiveMinimum`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ exclusiveMinimum: 5 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("maxItems", () => {
    test("invalid", async () => {
      registerSchema({ maxItems: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, 2], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/maxItems",
            absoluteKeywordLocation: `${schemaUri}#/maxItems`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ maxItems: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("minItems", () => {
    test("invalid", async () => {
      registerSchema({ minItems: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/minItems",
            absoluteKeywordLocation: `${schemaUri}#/minItems`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ minItems: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, 2], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("maxLength", () => {
    test("invalid", async () => {
      registerSchema({ maxLength: 2 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/maxLength",
            absoluteKeywordLocation: `${schemaUri}#/maxLength`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ maxLength: 2 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "a", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("minLength", () => {
    test("invalid", async () => {
      registerSchema({ minLength: 2 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "a", DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/minLength",
            absoluteKeywordLocation: `${schemaUri}#/minLength`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ minLength: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("maxProperties", () => {
    test("invalid", async () => {
      registerSchema({ maxProperties: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { a: 1, b: 2 }, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/maxProperties",
            absoluteKeywordLocation: `${schemaUri}#/maxProperties`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ maxProperties: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, {}, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("minProperties", () => {
    test("invalid", async () => {
      registerSchema({ minProperties: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, {}, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/minProperties",
            absoluteKeywordLocation: `${schemaUri}#/minProperties`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ minProperties: 1 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { a: 1, b: 2 }, DETAILED);

      expect(output).to.eql({ valid: true });
    });
  });

  describe("maximum", () => {
    test("invalid", async () => {
      registerSchema({ maximum: 5 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/maximum",
            absoluteKeywordLocation: `${schemaUri}#/maximum`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ maximum: 42 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 5, DETAILED);

      expect(output).to.eql({ valid: true });
    });
  });

  describe("minimum", () => {
    test("invalid", async () => {
      registerSchema({ minimum: 42 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 5, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/minimum",
            absoluteKeywordLocation: `${schemaUri}#/minimum`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ minimum: 5 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("multipleOf", () => {
    test("invalid", async () => {
      registerSchema({ multipleOf: 2 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 3, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/multipleOf",
            absoluteKeywordLocation: `${schemaUri}#/multipleOf`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ multipleOf: 2 }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 4, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("pattern", () => {
    test("invalid", async () => {
      registerSchema({ pattern: "^a" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "banana", DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/pattern",
            absoluteKeywordLocation: `${schemaUri}#/pattern`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ pattern: "^a" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "apple", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("required", () => {
    test("invalid", async () => {
      registerSchema({ required: ["a"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, {}, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/required",
            absoluteKeywordLocation: `${schemaUri}#/required`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("invalid - multiple missing", async () => {
      registerSchema({ required: ["a", "b"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, {}, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/required",
            absoluteKeywordLocation: `${schemaUri}#/required`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ required: ["a"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, { a: 1 }, DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("type", () => {
    test("invalid", async () => {
      registerSchema({ type: "string" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/type",
            absoluteKeywordLocation: `${schemaUri}#/type`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("invalid - multiple types", async () => {
      registerSchema({ type: ["string", "null"] }, schemaUri, dialectUri);
      const output = await validate(schemaUri, 42, DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/type",
            absoluteKeywordLocation: `${schemaUri}#/type`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ type: "string" }, schemaUri, dialectUri);
      const output = await validate(schemaUri, "foo", DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  describe("uniqueItems", () => {
    test("invalid", async () => {
      registerSchema({ uniqueItems: true }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, 1], DETAILED);

      expect(output).to.eql({
        valid: false,
        errors: [
          {
            keyword: "https://json-schema.org/keyword/uniqueItems",
            absoluteKeywordLocation: `${schemaUri}#/uniqueItems`,
            instanceLocation: "#"
          }
        ]
      });
    });

    test("valid", async () => {
      registerSchema({ uniqueItems: true }, schemaUri, dialectUri);
      const output = await validate(schemaUri, [1, 2], DETAILED);
      expect(output).to.eql({ valid: true });
    });
  });

  test("Multiple errors in schema", async () => {
    registerSchema({
      properties: {
        foo: { type: "string" },
        bar: { type: "boolean" }
      },
      required: ["foo", "bar"]
    }, schemaUri, dialectUri);
    const output = await validate(schemaUri, { foo: 42 }, DETAILED);

    expect(output).to.eql({
      valid: false,
      errors: [
        {
          keyword: "https://json-schema.org/keyword/properties",
          absoluteKeywordLocation: `${schemaUri}#/properties`,
          instanceLocation: "#",
          errors: [
            {
              keyword: "https://json-schema.org/keyword/type",
              absoluteKeywordLocation: `${schemaUri}#/properties/foo/type`,
              instanceLocation: "#/foo"
            }
          ]
        },
        {
          keyword: "https://json-schema.org/keyword/required",
          absoluteKeywordLocation: `${schemaUri}#/required`,
          instanceLocation: "#"
        }
      ]
    });
  });

  test("Deeply nested", async () => {
    registerSchema({
      properties: {
        foo: {
          properties: {
            bar: { type: "boolean" }
          }
        }
      }
    }, schemaUri, dialectUri);
    const output = await validate(schemaUri, { foo: { bar: 42 } }, DETAILED);

    expect(output).to.eql({
      valid: false,
      errors: [
        {
          keyword: "https://json-schema.org/keyword/properties",
          absoluteKeywordLocation: `${schemaUri}#/properties`,
          instanceLocation: "#",
          errors: [
            {
              keyword: "https://json-schema.org/keyword/properties",
              absoluteKeywordLocation: `${schemaUri}#/properties/foo/properties`,
              instanceLocation: "#/foo",
              errors: [
                {
                  keyword: "https://json-schema.org/keyword/type",
                  absoluteKeywordLocation: `${schemaUri}#/properties/foo/properties/bar/type`,
                  instanceLocation: "#/foo/bar"
                }
              ]
            }
          ]
        }
      ]
    });
  });
});
