import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, expect } from "vitest";
import { isCompatible } from "../../test/test-suite.js";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { draft202012Dialect, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";
import { draft201909Dialect, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { draft07Dialect, draft07DialectUri } from "../dialects/draft-07/index.js";
import { draft06Dialect, draft06DialectUri } from "../dialects/draft-06/index.js";
import { draft04Dialect, draft04DialectUri } from "../dialects/draft-04/index.js";
import { DETAILED } from "../output/index.js";
import { compile } from "../operations/compile.js";
import { bundle } from "../operations/bundle.js";
import { validatorFor, annotatorFor } from "../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Node } from "unist"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { CompiledSchema } from "../operations/compile.d.ts"
 * @import { DetailedValidationError } from "../output/validation-error.d.ts"
 * @import { BundleOptions } from "../operations/bundle.d.ts"
 */

/**
 * @typedef {{
 *   description: string;
 *   compatibility?: string;
 *   schema: Json;
 *   externalSchemas?: Record<string, Json>;
 *   tests: { description: string; instance: Json }[];
 * }} BundleTestCase
 */

const testDomain = "https://bundler.hyperjump.io";
const mainUri = `${testDomain}/main`;

/** Schemas every test case can reference */
const fixtures = {
  [`${testDomain}/string`]: { title: "String", type: "string" },
  [`${testDomain}/number`]: { title: "Number", type: "number" }
};

const testsPath = join(import.meta.dirname, "tests");

/** @type BundleTestCase[] */
const suite = readdirSync(testsPath)
  .flatMap((file) => /** @type BundleTestCase[] */ (JSON.parse(readFileSync(join(testsPath, file), "utf8"))));

/** @type BundleOptions[] */
const configs = [
  { definitionNamingStrategy: "uri" },
  { definitionNamingStrategy: "uuid" }
];

describe("bundle", () => {
  const jsonSchema = allDialects({ allowRetrieval: [] });

  // A bundle is compiled on its own, so it has to give the same output as the
  // schemas it was made from
  for (const [version, dialectUri] of /** @type const */ ([
    [9999, v1DialectUri],
    [2020, draft202012DialectUri],
    [2019, draft201909DialectUri],
    [7, draft07DialectUri],
    [6, draft06DialectUri],
    [4, draft04DialectUri]
  ])) {
    describe(dialectUri, () => {
      for (const testCase of suite.filter((testCase) => isCompatible(testCase.compatibility, version))) {
        describe(testCase.description, () => {
          for (const options of configs) {
            describe(JSON.stringify(options), () => {
              /** @type CompiledSchema */
              let unbundled;

              /** @type CompiledSchema */
              let bundled;

              beforeAll(async () => {
                const registry = registryOf({ ...fixtures, ...testCase.externalSchemas, [mainUri]: testCase.schema }, dialectUri);
                unbundled = await compile(jsonSchema, mainUri, { registry });

                const schema = await bundle(jsonSchema, mainUri, { registry, ...options });
                const bundleRegistry = new SchemaRegistry([{ schema, retrievalUri: mainUri }]);
                bundled = await compile(jsonSchema, mainUri, { registry: bundleRegistry });
              });

              for (const { description, instance } of testCase.tests) {
                test(description, () => {
                  expect(outputOf(bundled, instance)).to.eql(outputOf(unbundled, instance));
                });
              }
            });
          }
        });
      }
    });
  }

  describe("the bundled schema", () => {
    /** @type (schemas: Record<string, Json>, options?: BundleOptions) => Promise<Json> */
    const bundleOf = (schemas, options) => {
      const registry = registryOf(schemas, draft202012DialectUri);
      return bundle(jsonSchema, mainUri, { registry, ...options });
    };

    test("the main schema has $schema and is identified by its URI", async () => {
      expect(await bundleOf({ [mainUri]: { type: "string" } })).to.eql({
        $schema: draft202012DialectUri,
        $id: mainUri,
        type: "string"
      });
    });

    test("a relative $id is made absolute", async () => {
      const bundled = await bundleOf({
        [mainUri]: { $ref: "string" },
        [`${testDomain}/other`]: { $id: "string", type: "string" }
      });

      expect(bundled).to.eql({
        $schema: draft202012DialectUri,
        $id: mainUri,
        $ref: "string",
        $defs: {
          [`${testDomain}/string`]: { $id: `${testDomain}/string`, type: "string" }
        }
      });
    });

    test("an embedded schema is identified by its URI and named by it", async () => {
      const bundled = await bundleOf({ ...fixtures, [mainUri]: { $ref: "/string" } });

      expect(bundled).to.eql({
        $schema: draft202012DialectUri,
        $id: mainUri,
        $ref: "/string",
        $defs: {
          [`${testDomain}/string`]: { $id: `${testDomain}/string`, title: "String", type: "string" }
        }
      });
    });

    test("existing definitions are kept", async () => {
      const bundled = /** @type Record<string, Json> */ (await bundleOf({
        ...fixtures,
        [mainUri]: { $ref: "/string", $defs: { foo: { type: "null" } } }
      }));

      expect(Object.keys(/** @type object */ (bundled.$defs))).to.eql(["foo", `${testDomain}/string`]);
    });

    test("a schema that's referenced more than once is embedded once", async () => {
      const bundled = /** @type Record<string, Json> */ (await bundleOf({
        ...fixtures,
        [mainUri]: { anyOf: [{ $ref: "/string" }, { $ref: "/string" }, { $ref: "/number" }] },
        [`${testDomain}/foo`]: { $ref: "/string" }
      }));

      expect(Object.keys(/** @type object */ (bundled.$defs))).to.eql([`${testDomain}/string`, `${testDomain}/number`]);
    });

    test("references in unused definitions are bundled", async () => {
      const bundled = /** @type Record<string, Json> */ (await bundleOf({
        ...fixtures,
        [mainUri]: { $defs: { foo: { $ref: "/string" } } }
      }));

      expect(Object.keys(/** @type object */ (bundled.$defs))).to.eql(["foo", `${testDomain}/string`]);
    });

    test("a false schema is embedded as an object", async () => {
      const bundled = /** @type Record<string, Json> */ (await bundleOf({
        [mainUri]: { $ref: "/never" },
        [`${testDomain}/never`]: false
      }));

      expect(bundled.$defs).to.eql({
        [`${testDomain}/never`]: { $id: `${testDomain}/never`, not: {} }
      });
    });

    test("a plain-name fragment in a draft-04 id is kept", async () => {
      const registry = registryOf({
        [mainUri]: { items: { $ref: "/foo" } },
        [`${testDomain}/foo`]: { id: "/foo#bar", type: "string" }
      }, draft04DialectUri);
      const bundled = /** @type Record<string, Json> */ (await bundle(jsonSchema, mainUri, { registry }));

      expect(bundled).to.eql({
        $schema: `${draft04DialectUri}#`,
        id: mainUri,
        items: { $ref: "/foo" },
        definitions: {
          [`${testDomain}/foo`]: { id: `${testDomain}/foo#bar`, type: "string" }
        }
      });
    });

    test("a schema whose root is a $ref can't be embedded in draft-07", async () => {
      const registry = registryOf({
        ...fixtures,
        [mainUri]: { properties: { foo: { $ref: "/foo" } } },
        [`${testDomain}/foo`]: { $ref: "/string" }
      }, draft07DialectUri);

      await expect(bundle(jsonSchema, mainUri, { registry })).rejects.toThrow("its root is a '$ref'");
    });

    test("a schema can't be embedded in a draft-07 schema whose root is a $ref", async () => {
      const registry = registryOf({ ...fixtures, [mainUri]: { $ref: "/string" } }, draft07DialectUri);

      await expect(bundle(jsonSchema, mainUri, { registry })).rejects.toThrow("its root is a '$ref'");
    });

    test("a schema referenced by a URI it isn't identified by can't be embedded", async () => {
      const promise = bundleOf({
        [mainUri]: { $ref: "/foo" },
        [`${testDomain}/foo`]: { $id: "/bar", type: "string" }
      });

      await expect(promise).rejects.toThrow(`'${testDomain}/foo' is identified as '${testDomain}/bar'`);
    });
  });

  describe("options", () => {
    const schemas = {
      ...fixtures,
      [mainUri]: { properties: { foo: { $ref: "/string" }, bar: { $ref: "/number" } } }
    };

    /** @type (dialectUri: string, options: BundleOptions) => Promise<Record<string, Json>> */
    const bundleOf = async (dialectUri, options) => {
      const registry = registryOf(schemas, dialectUri);
      return /** @type Record<string, Json> */ (await bundle(jsonSchema, mainUri, { registry, ...options }));
    };

    test("externalSchemas aren't embedded", async () => {
      const bundled = await bundleOf(draft202012DialectUri, { externalSchemas: [`${testDomain}/string`] });

      expect(Object.keys(/** @type object */ (bundled.$defs))).to.eql([`${testDomain}/number`]);
    });

    test("alwaysIncludeDialect gives every embedded schema $schema", async () => {
      const bundled = await bundleOf(draft202012DialectUri, { alwaysIncludeDialect: true });
      const definitions = /** @type Record<string, Record<string, Json>> */ (bundled.$defs);

      expect(definitions[`${testDomain}/string`].$schema).to.equal(draft202012DialectUri);
    });

    test("alwaysIncludeDialect writes draft-07's dialect with an empty fragment", async () => {
      const bundled = await bundleOf(draft07DialectUri, { alwaysIncludeDialect: true });
      const definitions = /** @type Record<string, Record<string, Json>> */ (bundled.definitions);

      expect(definitions[`${testDomain}/string`].$schema).to.equal(`${draft07DialectUri}#`);
    });

    test("without alwaysIncludeDialect, an embedded schema in the same dialect doesn't have $schema", async () => {
      const bundled = await bundleOf(draft202012DialectUri, {});
      const definitions = /** @type Record<string, Record<string, Json>> */ (bundled.$defs);

      expect(definitions[`${testDomain}/string`]).to.not.have.property("$schema");
    });

    test("the uuid strategy names definitions with UUIDs", async () => {
      const bundled = await bundleOf(draft202012DialectUri, { definitionNamingStrategy: "uuid" });
      const definitions = /** @type Record<string, Record<string, Json>> */ (bundled.$defs);

      for (const name in definitions) {
        expect(name).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      }
      expect(Object.values(definitions).map((schema) => schema.$id)).to.eql([`${testDomain}/string`, `${testDomain}/number`]);
    });
  });

  describe("files", () => {
    // Files in the working directory are allowed by default
    const fileJsonSchema = allDialects();

    /** @type (name: string) => string */
    const fileUri = (name) => pathToFileURL(join(import.meta.dirname, "file-schemas", name)).href;

    const id = "https://example.com/schemas/main.schema.json";

    // A schema can't be identified by a file, so the bundle needs an
    // identifier, and its files are identified relative to it
    test("a file's bundle is identified by 'id', and embedded files relative to it", async () => {
      const bundled = await bundle(fileJsonSchema, fileUri("main.schema.json"), { id });

      expect(bundled).to.eql({
        $schema: draft202012DialectUri,
        $id: id,
        type: "object",
        properties: {
          foo: { $ref: "string.schema.json" }
        },
        $defs: {
          "https://example.com/schemas/string.schema.json": {
            $id: "https://example.com/schemas/string.schema.json",
            $schema: draft202012DialectUri,
            type: "string"
          }
        }
      });
    });

    test("a file's bundle validates like its files", async () => {
      const bundled = await bundle(fileJsonSchema, fileUri("main.schema.json"), { id });
      const compiled = await compile(fileJsonSchema, id, { registry: new SchemaRegistry().with(bundled) });

      expect(validatorFor(compiled)({ foo: "a" })).to.equal(true);
      expect(validatorFor(compiled)({ foo: 1 })).to.equal(false);
    });

    test("embedding a file without 'id' is an error", async () => {
      await expect(bundle(fileJsonSchema, fileUri("main.schema.json"))).rejects.toThrow("Give the bundle an identifier with the 'id' option");
    });

    test("a file that embeds nothing doesn't need 'id'", async () => {
      expect(await bundle(fileJsonSchema, fileUri("string.schema.json"))).to.eql({ $schema: draft202012DialectUri, type: "string" });
    });

    test("'id' can't be a file, relative, or have a fragment", async () => {
      await expect(bundle(fileJsonSchema, fileUri("main.schema.json"), { id: "file:///schemas/main.schema.json" })).rejects.toThrow("isn't a file");
      await expect(bundle(fileJsonSchema, fileUri("main.schema.json"), { id: "main.schema.json" })).rejects.toThrow("absolute URI");
      await expect(bundle(fileJsonSchema, fileUri("main.schema.json"), { id: `${id}#foo` })).rejects.toThrow("without a fragment");
    });

    test("schemas that aren't files keep their identifiers in a file's bundle", async () => {
      const registry = registryOf({ [`${testDomain}/number`]: { type: "number" } }, draft202012DialectUri);
      const bundled = /** @type Record<string, Json> */ (await bundle(fileJsonSchema, fileUri("mixed-schemes.schema.json"), { registry, id }));

      expect(Object.keys(/** @type object */ (bundled.$defs))).to.eql(["https://example.com/schemas/string.schema.json", `${testDomain}/number`]);
    });
  });
});

/** @type (config?: JsonSchemaConfig) => JsonSchema */
const allDialects = (config) => {
  const jsonSchema = new JsonSchema({ dialects: [v1Dialect, draft202012Dialect, draft201909Dialect, draft07Dialect, draft06Dialect, draft04Dialect], ...config });
  return jsonSchema;
};

/**
 * A registry of schemas by retrieval URI. A schema under `""` doesn't have
 * one, so it's only identified by its `$id`.
 *
 * @type (schemas: Record<string, Json>, dialectUri: string) => SchemaRegistry
 */
const registryOf = (schemas, dialectUri) => new SchemaRegistry(Object.entries(schemas)
  .map(([retrievalUri, schema]) => ({ schema, retrievalUri: retrievalUri || undefined, dialectUri })));

/**
 * What a compiled says about an instance: its DETAILED errors and the
 * annotations of every node, in document order
 *
 * @type (compiled: CompiledSchema, instance: Json) => Json
 */
const outputOf = (compiled, instance) => {
  const { output } = annotatorFor(compiled, { output: DETAILED })(instance);

  /** @type Json[] */
  const annotations = [];
  /** @type (node: Node & { children?: Node[] }) => void */
  const visit = (node) => {
    annotations.push([...node.data?.annotations ?? []]);
    node.children?.forEach(visit);
  };
  visit(annotatorFor(compiled)(instance).node);

  // Only JSON text has syntax errors
  /** @type (error: DetailedValidationError) => Json */
  const errorOf = (error) => ({
    ruleId: error.ruleId,
    absoluteKeywordLocation: error.absoluteKeywordLocation,
    instanceLocation: error.instanceLocation,
    errors: error.errors?.map(errorOf) ?? []
  });

  return { valid: output.valid, errors: output.errors.map((error) => errorOf(/** @type DetailedValidationError */ (error))), annotations };
};
