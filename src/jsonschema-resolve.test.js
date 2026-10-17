import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { pointerGet, rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "./json-schema.js";
import { jsonSchemaResolve } from "./jsonschema-resolve.js";
import idKeyword from "./keywords/id.js";
import anchorKeyword from "./keywords/anchor.js";
import dynamicAnchorKeyword from "./keywords/dynamicAnchor.js";
import legacyIdKeyword from "./keywords/draft-04/id.js";
import legacyRefKeyword from "./keywords/draft-04/ref.js";
import recursiveAnchorKeyword from "./keywords/draft-2019-09/recursiveAnchor.js";

/**
 * @import { JsonParseStatus } from "@hyperjump/browser/json"
 * @import { JsonSchemaResolveOptions } from "./jsonschema-resolve.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 */

const dialectUri = "https://example.com/dialect";
const legacyDialectUri = "https://example.com/legacy";
const strictDialectUri = "https://example.com/strict";
const baseUri = "https://example.com/schema";

/** @type (jsonSchema: JsonSchema) => void */
const addTestDialects = (jsonSchema) => {
  for (const keyword of [idKeyword, anchorKeyword, dynamicAnchorKeyword, legacyIdKeyword, legacyRefKeyword, recursiveAnchorKeyword]) {
    jsonSchema.addKeyword(keyword);
  }
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/defs", shape: { map: "schema" } });
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/properties", shape: { map: "schema" } });
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/allOf", shape: { array: "schema" } });
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/items", shape: ["schema", { array: "schema" }] });
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/type", shape: "data" });
  jsonSchema.addKeyword({ uri: "https://example.com/keyword/const", shape: "data" });

  jsonSchema.addDialect({
    uri: dialectUri,
    keywords: {
      $id: idKeyword.uri,
      $anchor: anchorKeyword.uri,
      $dynamicAnchor: dynamicAnchorKeyword.uri,
      $recursiveAnchor: recursiveAnchorKeyword.uri,
      $defs: "https://example.com/keyword/defs",
      properties: "https://example.com/keyword/properties",
      allOf: "https://example.com/keyword/allOf",
      items: "https://example.com/keyword/items",
      type: "https://example.com/keyword/type",
      const: "https://example.com/keyword/const",
      notSupported: "https://example.com/keyword/not-supported"
    },
    unknownKeywords: "annotation"
  });

  jsonSchema.addDialect({
    uri: legacyDialectUri,
    keywords: {
      $id: legacyIdKeyword.uri,
      $ref: legacyRefKeyword.uri,
      definitions: "https://example.com/keyword/defs",
      properties: "https://example.com/keyword/properties",
      type: "https://example.com/keyword/type"
    },
    unknownKeywords: "ignore"
  });

  jsonSchema.addDialect({
    uri: strictDialectUri,
    keywords: {
      $id: idKeyword.uri,
      $defs: "https://example.com/keyword/defs",
      type: "https://example.com/keyword/type"
    },
    unknownKeywords: "error"
  });
};

/**
 * @param {JsonSchema} jsonSchema
 * @param {string} json
 * @param {Partial<JsonSchemaResolveOptions> & { accept?: JsonParseStatus, path?: string }} [options]
 */
const resolve = async (jsonSchema, json, options = {}) => {
  const { accept, path, ...resolveOptions } = options;
  const file = new VFile({ value: json, path });
  const processor = unified()
    .use(rejsonParse, { accept })
    .use(jsonSchemaResolve, { jsonSchema, uri: path ? undefined : baseUri, ...resolveOptions });
  const document = await processor.run(processor.parse(file), file);

  return { document, file, root: /** @type JsonSchemaTolerantNode */ (document.children[0]) };
};

/** @type (pointer: string, node: JsonSchemaTolerantNode) => any */
const at = (pointer, node) => pointerGet(pointer, node);

/** @type (node: JsonSchemaTolerantNode, name: string) => JsonSchemaKeywordNode<any> */
const keywordNode = (node, name) => {
  if (node.jsonType !== "object") {
    throw Error("Not an object");
  }
  const property = node.children.find((property) => property.children[0].value === name);
  if (!property) {
    throw Error(`No '${name}' property`);
  }
  return /** @type JsonSchemaKeywordNode<any> */ (property);
};

/** @type (file: VFile) => (string | undefined)[] */
const ruleIds = (file) => file.messages.map((message) => message.ruleId);

describe("jsonSchemaResolve", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema();
    addTestDialects(jsonSchema);
  });

  describe("annotations", () => {
    test("schemas and keywords", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "type": "object",
        "properties": {
          "foo": { "type": "string" },
          "bar": true
        },
        "allOf": [{ "type": "number" }],
        "const": { "type": "not a schema" }
      }`);

      expect(file.messages).to.eql([]);
      expect(root).to.include({ type: "json-schema", dialectUri: dialectUri });
      expect(keywordNode(root, "$schema").keywordUri).to.equal("https://json-schema.org/keyword/schema");
      expect(keywordNode(root, "type").keywordUri).to.equal("https://example.com/keyword/type");
      expect(keywordNode(root, "properties").keywordUri).to.equal("https://example.com/keyword/properties");

      expect(at("/properties", root).type).to.equal("json");
      expect(at("/properties/foo", root)).to.include({ type: "json-schema", dialectUri: dialectUri });
      expect(at("/properties/bar", root)).to.include({ type: "json-schema", jsonType: "boolean" });
      expect(at("/allOf", root).type).to.equal("json");
      expect(at("/allOf/0", root).type).to.equal("json-schema");

      const constValue = at("/const", root);
      expect(constValue.type).to.equal("json");
      expect(keywordNode(constValue, "type").keywordUri).to.equal(undefined);
    });

    test("unknown keywords", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "foo": { "type": "string" } }`);

      expect(file.messages).to.eql([]);
      expect(keywordNode(root, "foo").keywordUri).to.equal("https://json-schema.org/keyword/unknown#foo");
      expect(at("/foo", root).type).to.equal("json");
    });

    test("$schema is a keyword in every dialect", async () => {
      jsonSchema.addDialect({ uri: "https://example.com/minimal", keywords: {}, unknownKeywords: "error" });
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "https://example.com/minimal" }`);

      expect(file.messages).to.eql([]);
      expect(root).to.include({ type: "json-schema", dialectUri: "https://example.com/minimal" });
      expect(keywordNode(root, "$schema").keywordUri).to.equal("https://json-schema.org/keyword/schema");
    });

    test("unknown keywords use the unknown keyword's definition", async () => {
      jsonSchema.addKeyword({ uri: "https://json-schema.org/keyword/unknown", shape: "schema" });
      const { root } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "foo": { "type": "string" } }`);

      expect(keywordNode(root, "foo").keywordUri).to.equal("https://json-schema.org/keyword/unknown#foo");
      expect(at("/foo", root).type).to.equal("json-schema");
    });

    test("an unknown keyword in a dialect that doesn't allow them", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${strictDialectUri}", "foo": 42 }`);

      expect(ruleIds(file)).to.eql(["unknown-keyword"]);
      expect(file.messages[0].place).to.eql(keywordNode(root, "foo").position);
      expect(keywordNode(root, "foo").keywordUri).to.equal("https://json-schema.org/keyword/unknown#foo");
    });

    test("x- keywords are allowed in a dialect that doesn't allow unknown keywords", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${strictDialectUri}", "x-foo": 42 }`);

      expect(file.messages).to.eql([]);
      expect(keywordNode(root, "x-foo").keywordUri).to.equal("https://json-schema.org/keyword/unknown#x-foo");
    });

    test("a misplaced $schema doesn't report keywords twice", async () => {
      jsonSchema.addDialect({ uri: "https://example.com/strict2", keywords: {}, unknownKeywords: "error" });
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${strictDialectUri}",
        "$defs": {
          "foo": { "$schema": "https://example.com/strict2", "bar": 42 }
        }
      }`);

      expect(ruleIds(file)).to.eql(["misplaced-dialect", "unknown-keyword"]);
    });

    test("a keyword in the dialect that isn't supported", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "notSupported": {} }`);

      expect(ruleIds(file)).to.eql(["unsupported-keyword"]);
      expect(keywordNode(root, "notSupported").keywordUri).to.equal("https://example.com/keyword/not-supported");
      expect(at("/notSupported", root).type).to.equal("json");
    });

    test("the first shape alternative that matches", async () => {
      const { root } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "properties": {
          "single": { "items": { "type": "string" } },
          "tuple": { "items": [{ "type": "string" }] },
          "neither": { "items": 42 }
        }
      }`);

      expect(at("/properties/single/items", root).type).to.equal("json-schema");
      expect(at("/properties/tuple/items", root).type).to.equal("json");
      expect(at("/properties/tuple/items/0", root).type).to.equal("json-schema");
      expect(at("/properties/neither/items", root).type).to.equal("json");
    });

    test("a value that doesn't match its shape is data", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "properties": [{}] }`);

      expect(file.messages).to.eql([]);
      expect(at("/properties/0", root).type).to.equal("json");
    });

    test("locations", async () => {
      const { root } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "properties": { "a/b": { "const": [1] } }
      }`);

      expect(root.location).to.equal(`${baseUri}#`);
      expect(at("/properties", root).location).to.equal(`${baseUri}#/properties`);
      expect(at("/properties/a~1b", root).location).to.equal(`${baseUri}#/properties/a~1b`);
      expect(at("/properties/a~1b/const/0", root).location).to.equal(`${baseUri}#/properties/a~1b/const/0`);
    });

    test("locations are percent-encoded where a fragment requires it", async () => {
      const { root } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "properties": { "a^b": { "const": { "c d": 1, "rosé": 2 } } }
      }`);

      expect(at("/properties/a^b", root).location).to.equal(`${baseUri}#/properties/a%5Eb`);
      expect(at("/properties/a^b/const/c d", root).location).to.equal(`${baseUri}#/properties/a%5Eb/const/c%20d`);
      expect(at("/properties/a^b/const/rosé", root).location).to.equal(`${baseUri}#/properties/a%5Eb/const/rosé`);
    });
  });

  describe("schema resources", () => {
    test("the document's URI", async () => {
      const { document } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}" }`);

      expect(document).to.include({ type: "json-schema-document", uri: baseUri, dialectUri: dialectUri, fragmentKind: "json-pointer" });
      expect(document.embedded).to.eql({ [baseUri]: document });
    });

    test("$id at the root changes the document's URI", async () => {
      const { document, root } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$id": "/root",
        "properties": { "foo": {} }
      }`);

      expect(document.uri).to.equal("https://example.com/root");
      expect(document.embedded).to.eql({ "https://example.com/root": document });
      expect(at("/properties/foo", root).location).to.equal("https://example.com/root#/properties/foo");
    });

    test("the document's URI comes from the file's path", async () => {
      const { document } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}" }`, { path: "/path/to/my schema.json" });

      expect(document.uri).to.equal("file:///path/to/my%20schema.json");
    });

    test("embedded resources", async () => {
      const { document, root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": {
            "$id": "/foo",
            "properties": { "bar": {} }
          }
        }
      }`);

      expect(file.messages).to.eql([]);

      const foo = at("/$defs/foo", root);
      const fooResource = document.embedded["https://example.com/foo"];
      expect(fooResource).to.include({ uri: "https://example.com/foo", dialectUri: dialectUri });
      expect(fooResource.children[0]).to.equal(foo);
      expect(fooResource.embedded).to.equal(document.embedded);
      expect(Object.keys(document.embedded)).to.eql([baseUri, "https://example.com/foo"]);

      expect(foo.location).to.equal("https://example.com/foo#");
      expect(at("/$defs/foo/properties/bar", root).location).to.equal("https://example.com/foo#/properties/bar");
    });

    test("a relative $id resolves against the resource it's embedded in", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": {
            "$id": "https://other.example.com/a/",
            "$defs": {
              "bar": { "$id": "b" }
            }
          }
        }
      }`);

      expect(Object.keys(document.embedded)).to.include("https://other.example.com/a/b");
    });

    test("$id can't have a fragment", async () => {
      const { document, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": { "foo": { "$id": "/foo#bar" } }
      }`);

      expect(ruleIds(file)).to.eql([idKeyword.uri]);
      expect(Object.keys(document.embedded)).to.eql([baseUri]);
    });

    test("duplicate $id", async () => {
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": { "$id": "/foo" },
          "bar": { "$id": "/foo" }
        }
      }`);

      expect(ruleIds(file)).to.eql(["duplicate-id"]);
    });
  });

  describe("anchors", () => {
    test("$anchor", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$anchor": "root",
        "$defs": { "foo": { "$anchor": "foo" } }
      }`);

      expect(document.anchors).to.eql({ root: "", foo: "/$defs/foo" });
    });

    test("an anchor belongs to the resource its schema starts, even if it comes first", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": { "foo": { "$anchor": "foo", "$id": "/foo" } }
      }`);

      expect(document.anchors).to.eql({});
      expect(document.embedded["https://example.com/foo"].anchors).to.eql({ foo: "" });
    });

    test("$dynamicAnchor", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": { "foo": { "$dynamicAnchor": "foo" } }
      }`);

      expect(document.dynamicAnchors).to.eql({ foo: "/$defs/foo" });
      expect(document.anchors).to.eql({ foo: "/$defs/foo" });
    });

    test("$recursiveAnchor", async () => {
      const { document } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "$recursiveAnchor": true }`);

      expect(document.dynamicAnchors).to.eql({ "": "" });
    });

    test("duplicate anchors", async () => {
      const { document, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": { "$anchor": "foo" },
          "bar": { "$anchor": "foo" }
        }
      }`);

      expect(ruleIds(file)).to.eql(["duplicate-anchor"]);
      expect(document.anchors).to.eql({ foo: "/$defs/foo" });
    });
  });

  describe("dialects", () => {
    test("no dialect", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "type": "string" }`);

      expect(ruleIds(file)).to.eql(["missing-dialect"]);
      expect(root.type).to.equal("json");
      expect(keywordNode(root, "type").keywordUri).to.equal(undefined);
    });

    test("the dialect option", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "type": "string" }`, { dialectUri });

      expect(file.messages).to.eql([]);
      expect(root).to.include({ type: "json-schema", dialectUri: dialectUri });
    });

    test("the default dialect", async () => {
      jsonSchema = new JsonSchema({ defaultDialectUri: dialectUri });
      addTestDialects(jsonSchema);
      const { root } = await resolve(jsonSchema, `{ "type": "string" }`);

      expect(root).to.include({ type: "json-schema", dialectUri: dialectUri });
    });

    test("$schema takes precedence over the dialect option", async () => {
      const { root } = await resolve(jsonSchema, `{ "$schema": "${legacyDialectUri}" }`, { dialectUri });

      expect(root.type === "json-schema" && root.dialectUri).to.equal(legacyDialectUri);
    });

    test("an embedded resource with a different dialect", async () => {
      const { document, root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": {
            "$schema": "${legacyDialectUri}",
            "$id": "/foo",
            "definitions": { "bar": {} }
          }
        }
      }`);

      expect(file.messages).to.eql([]);
      expect(document.embedded["https://example.com/foo"].dialectUri).to.equal(legacyDialectUri);
      expect(keywordNode(at("/$defs/foo", root), "definitions").keywordUri).to.equal("https://example.com/keyword/defs");
      expect(at("/$defs/foo/definitions/bar", root).dialectUri).to.equal(legacyDialectUri);
    });

    test("$schema is ignored where a resource doesn't start", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": {
            "$schema": "${legacyDialectUri}",
            "definitions": {}
          }
        }
      }`);

      expect(ruleIds(file)).to.eql(["misplaced-dialect"]);
      expect(at("/$defs/foo", root).dialectUri).to.equal(dialectUri);
      expect(keywordNode(at("/$defs/foo", root), "definitions").keywordUri).to.equal("https://json-schema.org/keyword/unknown#definitions");
    });

    test("a dialect that can't be retrieved", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "file:///does/not/exist" }`);

      expect(ruleIds(file)).to.eql(["unknown-dialect"]);
      expect(root.type).to.equal("json");
    });

    test("$schema that isn't a string", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": 42 }`, { dialectUri });

      expect(ruleIds(file)).to.eql(["invalid-dialect"]);
      expect(root.type).to.equal("json");
    });

    describe("from $vocabulary", () => {
      /** @type string */
      let directory;

      /** @type (name: string, schema: unknown) => Promise<string> */
      const schemaFile = async (name, schema) => {
        const path = join(directory, name);
        await writeFile(path, JSON.stringify(schema));
        return pathToFileURL(path).toString();
      };

      /** @type (name: string, vocabularies: Record<string, boolean>) => Promise<string> */
      const metaSchema = async (name, vocabularies) => {
        return schemaFile(`${name}.schema.json`, { $schema: dialectUri, $vocabulary: vocabularies });
      };

      /** @type (error: unknown) => string */
      const causes = (error) => error instanceof Error ? `${error.message} ${causes(error.cause)}` : "";

      beforeAll(async () => {
        directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
      });

      afterAll(async () => {
        await rm(directory, { recursive: true });
      });

      beforeEach(() => {
        jsonSchema.addVocabulary({
          uri: "https://example.com/vocab/core",
          keywords: { $id: idKeyword.uri, $defs: "https://example.com/keyword/defs" }
        });
      });

      test("the dialect is built from the vocabularies", async () => {
        const uri = await metaSchema("meta", {
          "https://example.com/vocab/core": true,
          "https://example.com/vocab/optional": false
        });
        const { root, file } = await resolve(jsonSchema, `{ "$schema": "${uri}", "$defs": { "foo": {} } }`);

        expect(file.messages).to.eql([]);
        expect(keywordNode(root, "$defs").keywordUri).to.equal("https://example.com/keyword/defs");
        expect(at("/$defs/foo", root).type).to.equal("json-schema");
      });

      test("a required vocabulary that isn't supported", async () => {
        const uri = await metaSchema("required", { "https://example.com/vocab/required": true });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("https://example.com/vocab/required");
      });

      test("a meta-schema that isn't a schema isn't used", async () => {
        const uri = await schemaFile("meta.json", { $vocabulary: { "https://example.com/vocab/core": true } });
        const { root, file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("isn't a schema");
        expect(root.type).to.equal("json");
      });

      test("a meta-schema that describes itself", { timeout: 2000 }, async () => {
        const path = join(directory, "self.schema.json");
        const uri = pathToFileURL(path).toString();
        await writeFile(path, JSON.stringify({
          $schema: uri,
          $vocabulary: { "https://example.com/vocab/core": true },
          $defs: { foo: {} }
        }));
        const { root, file } = await resolve(jsonSchema, `{ "$schema": "${uri}", "$defs": { "foo": {} } }`);

        expect(file.messages).to.eql([]);
        expect(at("/$defs/foo", root).type).to.equal("json-schema");

        const metaSchema = await jsonSchema.get(uri);
        expect(metaSchema).to.include({ type: "json-schema", dialectUri: uri });
      });

      test("a self-describing meta-schema without $vocabulary", { timeout: 2000 }, async () => {
        const path = join(directory, "self-no-vocabulary.schema.json");
        const uri = pathToFileURL(path).toString();
        await writeFile(path, JSON.stringify({ $schema: uri }));
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
      });

      test("meta-schemas that depend on each other", { timeout: 2000 }, async () => {
        const aUri = pathToFileURL(join(directory, "a.schema.json")).toString();
        const bUri = pathToFileURL(join(directory, "b.schema.json")).toString();
        await schemaFile("a.schema.json", { $schema: bUri, $vocabulary: { "https://example.com/vocab/core": true } });
        await schemaFile("b.schema.json", { $schema: aUri, $vocabulary: { "https://example.com/vocab/core": true } });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${aUri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);

        expect(causes(file.messages[0])).to.contain("depend on each other");
      });

      test("a document that describes itself defines its dialect", async () => {
        const { root, file } = await resolve(jsonSchema, `{
          "$schema": "${baseUri}",
          "$vocabulary": { "https://example.com/vocab/core": true },
          "$defs": { "foo": {} }
        }`);

        expect(file.messages).to.eql([]);
        expect(root).to.include({ type: "json-schema", dialectUri: baseUri });
        expect(at("/$defs/foo", root).type).to.equal("json-schema");
        expect(await jsonSchema.getDialect(baseUri)).to.eql({ uri: baseUri, keywords: { $id: idKeyword.uri, $defs: "https://example.com/keyword/defs" }, unknownKeywords: "annotation" });
      });

      test("a meta-schema without $vocabulary", async () => {
        const uri = await schemaFile("none.schema.json", { $schema: dialectUri });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("doesn't have a '$vocabulary'");
      });

      test("a self-describing meta-schema doesn't replace a dialect that's already defined", async () => {
        const dialect = await jsonSchema.getDialect(dialectUri);
        const { root, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$vocabulary": { "https://example.com/vocab/core": true }
        }`, { uri: dialectUri });

        expect(file.messages).to.eql([]);
        expect(root).to.include({ type: "json-schema", dialectUri: dialectUri });
        expect(await jsonSchema.getDialect(dialectUri)).to.equal(dialect);
      });
    });
  });

  describe("draft-04 through draft-07", () => {
    test("$ref replaces the whole schema", async () => {
      const { document, root, file } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "type": "string" } },
        "properties": {
          "foo": { "$ref": "#/definitions/a", "$id": "https://other.example.com/", "type": "number" }
        }
      }`);

      expect(file.messages).to.eql([]);

      const foo = at("/properties/foo", root);
      expect(foo).to.include({ type: "reference", href: `${baseUri}#/definitions/a`, location: `${baseUri}#/properties/foo` });
      expect(keywordNode(foo, "$ref").keywordUri).to.equal(undefined);
      expect(keywordNode(foo, "type").keywordUri).to.equal(undefined);
      expect(at("/properties/foo/type", root)).to.include({ type: "json", location: `${baseUri}#/properties/foo/type` });
      expect(Object.keys(document.embedded)).to.eql([baseUri]);
    });

    test("an invalid $id is reported", async () => {
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$id": "http://[bad" } }
      }`);

      expect(ruleIds(file)).to.eql([legacyIdKeyword.uri]);
    });

    test("unknown keywords ignored because of $ref aren't reported", async () => {
      jsonSchema.addDialect({
        uri: "https://example.com/strict-legacy",
        keywords: { $ref: legacyRefKeyword.uri },
        unknownKeywords: "error"
      });
      const { file } = await resolve(jsonSchema, `{
        "$schema": "https://example.com/strict-legacy",
        "$ref": "#",
        "foo": 42
      }`);

      expect(file.messages).to.eql([]);
    });

    test("keywords ignored because of $ref aren't reported", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$ref": "#", "$id": "http://[bad" } }
      }`);

      expect(file.messages).to.eql([]);
      expect(at("/definitions/a", root).type).to.equal("reference");
    });

    test("a fragment-only $id is an anchor", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$id": "#foo" } }
      }`);

      expect(document.anchors).to.eql({ foo: "/definitions/a" });
      expect(Object.keys(document.embedded)).to.eql([baseUri]);
    });

    test("$id with a fragment identifies a resource and an anchor", async () => {
      const { document } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$id": "/a#foo" } }
      }`);

      expect(document.embedded["https://example.com/a"].anchors).to.eql({ foo: "" });
    });
  });

  describe("error tolerant parsing", () => {
    test("values that couldn't be parsed are skipped", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "properties": { "foo": , "bar": { "type": NaN } },
        "allOf": [{ "type": "string" }]
      }`, { accept: "failure" });

      expect(ruleIds(file).every((ruleId) => ruleId !== undefined)).to.equal(true);
      expect(file.messages.every((message) => message.source === "json")).to.equal(true);
      expect(root.type).to.equal("json-schema");
      expect(at("/properties/bar", root).type).to.equal("json-schema");
      expect(at("/properties/bar/type", root)).to.include({ type: "json-invalid", location: `${baseUri}#/properties/bar/type` });
      expect(at("/allOf/0", root).type).to.equal("json-schema");
    });
  });

  describe("retrieving schemas", () => {
    /** @type string */
    let directory;

    /** @type (name: string, schema: unknown) => Promise<string> */
    const schemaFile = async (name, schema) => {
      const path = join(directory, name);
      await writeFile(path, JSON.stringify(schema));
      return pathToFileURL(path).toString();
    };

    beforeAll(async () => {
      directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
    });

    afterAll(async () => {
      await rm(directory, { recursive: true });
    });

    test("a .schema.json file is a schema", async () => {
      const uri = await schemaFile("main.schema.json", {
        $schema: dialectUri,
        $defs: { foo: { $anchor: "foo", type: "string" } }
      });

      const foo = await jsonSchema.get(`${uri}#foo`);
      expect(foo).to.include({ type: "json-schema", location: `${uri}#/$defs/foo` });
    });

    test("references between embedded resources", async () => {
      const uri = await schemaFile("embedded.schema.json", {
        $schema: legacyDialectUri,
        properties: { foo: { $ref: "https://example.com/a" } },
        definitions: {
          a: { $id: "https://example.com/a", properties: { b: { $ref: "b" } } },
          b: { $id: "https://example.com/b", type: "string" }
        }
      });

      const a = await jsonSchema.get(`${uri}#/properties/foo`);
      expect(a.location).to.equal("https://example.com/a#");

      const b = await jsonSchema.step("b", await jsonSchema.step("properties", a));
      expect(b.location).to.equal("https://example.com/b#");
    });

    test("a schema with problems can't be retrieved", async () => {
      const uri = await schemaFile("invalid.schema.json", { type: "string" });

      await expect(jsonSchema.get(uri)).rejects.toMatchObject({ cause: { ruleId: "missing-dialect" } });
    });
  });
});
