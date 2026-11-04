import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { getSchema, toSchema, loadDialect, unloadDialect, defineVocabulary } from "./experimental.js";
import { registerSchema, unregisterSchema } from "../v1/index.js";
import "../draft-2020-12/index.js";
import "../draft-2019-09/index.js";
import "../draft-07/index.js";
import "../draft-04/index.js";

import type { Browser } from "@hyperjump/browser";
import type { SchemaDocument, ToSchemaOptions } from "./experimental.js";


describe("JSON Schema - toString", () => {
  const testDomain = "https://json-schema.hyperjump.io";

  afterEach(() => {
    unregisterSchema(`${testDomain}/schema`);
  });

  describe("dialect and self-identification", () => {
    const contextDialectId = "https://json-schema.org/v1";
    let schema: Browser<SchemaDocument>;

    beforeEach(async () => {
      registerSchema({}, `${testDomain}/schema`, contextDialectId);
      schema = await getSchema(`${testDomain}/schema`);
    });

    test("default options", () => {
      expect(toSchema(schema)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: v1", () => {
      const options = { contextDialectId: contextDialectId };
      expect(toSchema(schema, options)).to.eql({
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: 2020-12", () => {
      const options = { contextDialectId: "https://json-schema.org/draft/2020-12/schema" };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: v1, includeDialect: auto", () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "auto"
      };
      expect(toSchema(schema, options)).to.eql({
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: 2020-12, includeDialect: auto", () => {
      const options: ToSchemaOptions = {
        contextDialectId: "https://json-schema.org/draft/2020-12/schema",
        includeDialect: "auto"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: v1, includeDialect: always", () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "always"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("contextDialectId: v1, includeDialect: never", () => {
      const options: ToSchemaOptions = {
        contextDialectId: contextDialectId,
        includeDialect: "never"
      };
      expect(toSchema(schema, options)).to.eql({
        $id: `${testDomain}/schema`
      });
    });

    test("contextUri: same as baseURI", () => {
      const options: ToSchemaOptions = {
        contextUri: `${testDomain}/schema`
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId
      });
    });

    test("contextUri: testDomain", () => {
      const options: ToSchemaOptions = {
        contextUri: testDomain
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: "/schema"
      });
    });

    test("contextUri: not relative to baseURI", () => {
      const options: ToSchemaOptions = {
        contextUri: "urn:example:example"
      };
      expect(toSchema(schema, options)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });
  });

  test("file self-identification", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    const schema = await getSchema("./lib/string.schema.json");
    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      type: "string"
    });
  });

  test("legacy self-identification", async () => {
    const contextDialectId = "http://json-schema.org/draft-04/schema#";
    registerSchema({}, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    const options: ToSchemaOptions = {};
    expect(toSchema(schema, options)).to.eql({
      $schema: contextDialectId,
      id: `${testDomain}/schema`
    });
  });

  test("identifier with a query", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({}, `${testDomain}/schema?foo=bar&baz`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema?foo=bar&baz`);
    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema?foo=bar&baz`
    });
  });

  test("anchors", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({
      $anchor: "root",

      type: "object",
      properties: {
        foo: { $anchor: "foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $anchor: "root",

      type: "object",
      properties: {
        foo: { $anchor: "foo" }
      }
    });
  });

  test("legacy anchors", async () => {
    const contextDialectId = "http://json-schema.org/draft-07/schema#";
    registerSchema({
      $id: "#root",

      type: "object",
      properties: {
        foo: { $id: "#foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema#root`,

      type: "object",
      properties: {
        foo: { $id: "#foo" }
      }
    });
  });

  test("dynamic anchors", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    });
  });

  test("legacy dynamic anchors", async () => {
    const contextDialectId = "https://json-schema.org/draft/2020-12/schema";
    registerSchema({
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $dynamicAnchor: "root",

      type: "object",
      properties: {
        foo: { $dynamicAnchor: "foo" }
      }
    });
  });

  test("recursive anchors", async () => {
    const contextDialectId = "https://json-schema.org/draft/2019-09/schema";
    registerSchema({
      $recursiveAnchor: true
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $recursiveAnchor: true
    });
  });

  test("references", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({
      $ref: "#/$defs/foo",
      $defs: {
        foo: {}
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $ref: "#/$defs/foo",
      $defs: {
        foo: {}
      }
    });
  });

  test("legacy references", async () => {
    const contextDialectId = "http://json-schema.org/draft-07/schema#";
    registerSchema({
      allOf: [{ "$ref": "#/$defs/foo" }],
      $defs: {
        foo: {}
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $id: `${testDomain}/schema`,
      $schema: contextDialectId,
      allOf: [{ $ref: "#/$defs/foo" }],
      $defs: {
        foo: {}
      }
    });
  });

  test("include embedded schemas", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({
      $ref: "foo",
      $defs: {
        foo: { $id: "foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $ref: "foo",
      $defs: {
        foo: { $id: `${testDomain}/foo` }
      }
    });
  });

  test("embedded file-schema", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    const schema = await getSchema("./lib/bundled.schema.json");
    expect(toSchema(schema)).to.eql({
      $schema: contextDialectId,
      type: "object",
      properties: {
        foo: { $ref: "string.schema.json" }
      },
      $defs: {
        "string.schema.json": {
          $id: "string.schema.json",
          type: "string"
        }
      }
    });
  });

  test("exclude embedded schemas", async () => {
    const contextDialectId = "https://json-schema.org/v1";
    registerSchema({
      $ref: "foo",
      $defs: {
        foo: { $id: "foo" }
      }
    }, `${testDomain}/schema`, contextDialectId);

    const schema = await getSchema(`${testDomain}/schema`);

    expect(toSchema(schema, { includeEmbedded: false })).to.eql({
      $schema: contextDialectId,
      $id: `${testDomain}/schema`,
      $ref: "foo"
    });
  });

  describe("boolean schemas", () => {
    const contextDialectId = "https://json-schema.org/v1";

    test("convert true schema to object when adding metadata", async () => {
      registerSchema(true, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`
      });
    });

    test("convert false schema to object when adding metadata", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema)).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`,
        not: {}
      });
    });

    test("convert false schema with only $id metadata", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextDialectId })).to.eql({
        $id: `${testDomain}/schema`,
        not: {}
      });
    });

    test("convert false schema with only $schema metadata", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextUri: `${testDomain}/schema` })).to.eql({
        $schema: contextDialectId,
        not: {}
      });
    });

    test("convert true schema with only $id metadata", async () => {
      registerSchema(true, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextDialectId })).to.eql({
        $id: `${testDomain}/schema`
      });
    });

    test("convert true schema with only $schema metadata", async () => {
      registerSchema(true, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextUri: `${testDomain}/schema` })).to.eql({
        $schema: contextDialectId
      });
    });

    test("preserve boolean true when neither $id nor $schema is added", async () => {
      registerSchema(true, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextDialectId, contextUri: `${testDomain}/schema` })).to.equal(true);
    });

    test("preserve boolean false when neither $id nor $schema is added", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextDialectId, contextUri: `${testDomain}/schema` })).to.equal(false);
    });

    test("convert false schema with includeDialect: always", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { contextDialectId, includeDialect: "always" })).to.eql({
        $schema: contextDialectId,
        $id: `${testDomain}/schema`,
        not: {}
      });
    });

    test("convert false schema with includeDialect: never", async () => {
      registerSchema(false, `${testDomain}/schema`, contextDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema, { includeDialect: "never" })).to.eql({
        $id: `${testDomain}/schema`,
        not: {}
      });
    });

    test("convert false schema with draft-07 dialect", async () => {
      const draft07Dialect = "http://json-schema.org/draft-07/schema";
      registerSchema(false, `${testDomain}/schema`, draft07Dialect);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema)).to.eql({
        $schema: `${draft07Dialect}#`,
        $id: `${testDomain}/schema`,
        not: {}
      });
    });

    test("convert true schema with draft-07 dialect", async () => {
      const draft07Dialect = "http://json-schema.org/draft-07/schema";
      registerSchema(true, `${testDomain}/schema`, draft07Dialect);
      const schema = await getSchema(`${testDomain}/schema`);

      expect(toSchema(schema)).to.eql({
        $schema: `${draft07Dialect}#`,
        $id: `${testDomain}/schema`
      });
    });

    test("throw error when converting false in dialect lacking not keyword", async () => {
      const noNotDialect = "https://example.com/no-not-dialect";
      loadDialect(noNotDialect, {
        "https://json-schema.org/v1/vocab/core": true
      }, false, false);

      registerSchema(false, `${testDomain}/schema`, noNotDialect);
      const schema = await getSchema(`${testDomain}/schema`);

      try {
        expect(() => toSchema(schema)).to.throw(
          `Dialect '${noNotDialect}' does not have a 'not' keyword registered to convert a 'false' schema.`
        );
      } finally {
        unloadDialect(noNotDialect);
      }
    });

    test("convert true schema in dialect lacking not keyword without throwing", async () => {
      const noNotDialect = "https://example.com/no-not-dialect-true";
      loadDialect(noNotDialect, {
        "https://json-schema.org/v1/vocab/core": true
      }, false, false);

      registerSchema(true, `${testDomain}/schema`, noNotDialect);
      const schema = await getSchema(`${testDomain}/schema`);

      try {
        expect(toSchema(schema)).to.eql({
          $schema: noNotDialect,
          $id: `${testDomain}/schema`
        });
      } finally {
        unloadDialect(noNotDialect);
      }
    });

    test("convert false schema using custom keyword name for not", async () => {
      const customDialectId = "https://example.com/custom-not-dialect";
      const customVocabId = "https://example.com/custom-not-vocab";

      defineVocabulary(customVocabId, {
        "$id": "https://json-schema.org/keyword/id",
        "disallow": "https://json-schema.org/keyword/not"
      });

      loadDialect(customDialectId, {
        [customVocabId]: true
      }, false, false);

      registerSchema(false, `${testDomain}/schema`, customDialectId);
      const schema = await getSchema(`${testDomain}/schema`);

      try {
        expect(toSchema(schema)).to.eql({
          $schema: customDialectId,
          $id: `${testDomain}/schema`,
          disallow: {}
        });
      } finally {
        unloadDialect(customDialectId);
      }
    });
  });
});
