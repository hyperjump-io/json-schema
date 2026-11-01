import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { fromJson, HttpError, jrefStep, jsonPointerGet, rejsonParse, RetrievalNotAllowedError } from "@hyperjump/browser";
import { JsonSchema, SchemaError, extendDialect } from "../json-schema.js";
import { jsonSchemaResolve, resolveSchema } from "./resolve.js";
import idKeyword from "../keywords/id.js";
import anchorKeyword from "../keywords/anchor.js";
import dynamicAnchorKeyword from "../keywords/dynamicAnchor.js";
import legacyIdKeyword from "../keywords/draft-07/id.js";
import legacyRefKeyword from "../keywords/draft-07/ref.js";
import recursiveAnchorKeyword from "../keywords/draft-2019-09/recursiveAnchor.js";
import vocabularyKeyword from "../keywords/vocabulary.js";

/**
 * @import { JsonDocumentNode, JsonParseStatus } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { DialectConfig, DialectExtension } from "../dialect.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchemaResolveOptions } from "./resolve.d.ts"
 * @import { JsonSchemaKeywordNode, JsonSchemaTolerantNode } from "./schema-ast.d.ts"
 */

const dialectUri = "https://example.com/dialect";
const legacyDialectUri = "https://example.com/legacy";
const strictDialectUri = "https://example.com/strict";
const baseUri = "https://example.com/schema";

describe("resolveSchema", () => {
  test("problems are returned as data, and the tree becomes the schema AST", async () => {
    const { node } = fromJson(JSON.stringify({ $schema: dialectUri, $id: "#not-absolute" }));
    const tree = /** @type JsonDocumentNode */ ({ type: "json-document", status: "success", children: [node] });
    const { document, messages } = await resolveSchema(tree, { session: testJsonSchema().session(), uri: baseUri });

    expect(document.type).to.equal("json-schema-document");
    expect(document.uri).to.equal(baseUri);
    expect(messages.map(({ ruleId, severity, uri }) => [ruleId, severity, uri])).to.eql([[idKeyword.uri, "error", baseUri]]);
  });

  test("messages about keywords that turn out to be ignored are dropped", async () => {
    // `$schema` that isn't where a resource starts is ignored, and the
    // schema is read again with its parent's dialect
    const { node } = fromJson(JSON.stringify({ $schema: dialectUri, properties: { a: { $schema: strictDialectUri, foo: 1 } } }));
    const tree = /** @type JsonDocumentNode */ ({ type: "json-document", status: "success", children: [node] });
    const { messages } = await resolveSchema(tree, { session: testJsonSchema().session(), uri: baseUri });

    expect(messages.map(({ ruleId }) => ruleId)).to.eql(["misplaced-dialect"]);
  });
});

describe("jsonSchemaResolve", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = testJsonSchema();
    served.clear();
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

    test("the session is on the file for lint rules", async () => {
      const session = jsonSchema.session();
      const { file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}" }`, { session });

      expect(file.data.jsonSchemaSession).to.equal(session);
    });

    test("unknown keywords", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "foo": { "type": "string" } }`);

      expect(file.messages).to.eql([]);
      expect(keywordNode(root, "foo").keywordUri).to.equal("https://json-schema.org/keyword/unknown#foo");
      expect(at("/foo", root).type).to.equal("json");
    });

    test("$schema is a keyword in every dialect", async () => {
      const jsonSchema = testJsonSchema({ dialects: [{ uri: "https://example.com/minimal", keywords: {}, unknownKeywords: "error" }] });
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "https://example.com/minimal" }`);

      expect(file.messages).to.eql([]);
      expect(root).to.include({ type: "json-schema", dialectUri: "https://example.com/minimal" });
      expect(keywordNode(root, "$schema").keywordUri).to.equal("https://json-schema.org/keyword/schema");
    });

    test("unknown keywords use the unknown keyword's definition", async () => {
      const jsonSchema = testJsonSchema({ keywords: [{ uri: "https://json-schema.org/keyword/unknown", shape: "schema" }] });
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
      const jsonSchema = testJsonSchema({ dialects: [{ uri: "https://example.com/strict2", keywords: {}, unknownKeywords: "error" }] });
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${strictDialectUri}",
        "$defs": {
          "foo": { "$schema": "https://example.com/strict2", "bar": 42 }
        }
      }`);

      expect(ruleIds(file)).to.eql(["misplaced-dialect", "unknown-keyword"]);
    });

    test("a keyword in the dialect that isn't supported", async () => {
      // A dialect in the config can't name a keyword that isn't defined, but
      // one a meta-schema defines can
      const jsonSchema = testJsonSchema({
        extension: {
          keywords: {
            defineUnsupported: {
              uri: "https://example.com/keyword/define-unsupported",
              shape: "data",
              resolve: (_valueNode, context) => {
                context.defineDialect({ keywords: { notSupported: "https://example.com/keyword/not-supported" }, unknownKeywords: "annotation" });
              }
            }
          }
        }
      });
      const metaSchemaUri = serve("unsupported", { $schema: dialectUri, defineUnsupported: true });
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${metaSchemaUri}", "notSupported": {} }`);

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

    test("a reference has the URI it resolves to, against the resource it's in", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$ref": "#/$defs/a",
        "$defs": {
          "a": { "$id": "/other/", "$ref": "b.json" }
        }
      }`);

      expect(file.messages).to.eql([]);
      expect(at("/$ref", root)).to.include({ type: "json", href: "https://example.com/schema#/$defs/a" });
      expect(at("/$defs/a/$ref", root)).to.include({ type: "json", href: "https://example.com/other/b.json" });
    });

    test("a value that isn't a URI reference where its shape expects one is reported and has no URI", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "$ref": "a b", "allOf": [{ "$ref": 1 }] }`);

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["Expected a URI reference", "https://example.com/keyword/ref"],
        ["Expected a URI reference", "https://example.com/keyword/ref"]
      ]);
      expect(at("/$ref", root).href).to.equal(undefined);
      expect(at("/allOf/0/$ref", root).href).to.equal(undefined);
    });

    test("a reference written as a file: URI is reported and has no URI", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$ref": "FILE:///folder/a.schema.json"
      }`, { uri: "file:///folder/schema.json" });

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["The reference to 'FILE:///folder/a.schema.json' is a 'file:' URI, which only finds the file on this machine. Use a reference relative to the schema.", "file-uri-not-allowed"]
      ]);
      expect(at("/$ref", root).href).to.equal(undefined);
    });

    test("a relative reference in a file resolves to a file", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$ref": "a.schema.json"
      }`, { uri: "file:///folder/schema.json" });

      expect(file.messages).to.eql([]);
      expect(at("/$ref", root).href).to.equal("file:///folder/a.schema.json");
    });

    test("a schema a keyword doesn't apply is resolved like any schema", async () => {
      const { document, root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "contentSchema": { "$id": "/content", "type": "string" }
      }`);

      expect(file.messages).to.eql([]);
      expect(at("/contentSchema", root).type).to.equal("json-schema");
      expect(Object.keys(document.embedded)).to.include("https://example.com/content");
    });

    test("every problem is an error, and the rest of the document is still resolved", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "properties": [], "allOf": [1] }`);

      expect(file.messages.map(({ ruleId, fatal }) => [ruleId, fatal])).to.eql([
        ["https://example.com/keyword/properties", true],
        ["invalid-schema", true]
      ]);
      expect(root.type).to.equal("json-schema");
    });

    test("a map or array of the wrong type is reported and is data", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "properties": [{}], "allOf": {} }`);

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["Expected an object", "https://example.com/keyword/properties"],
        ["Expected an array", "https://example.com/keyword/allOf"]
      ]);
      expect(at("/properties/0", root).type).to.equal("json");
    });

    test("a value that isn't a schema where its shape expects one is an invalid schema", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "properties": { "foo": 1 },
        "allOf": ["nope"],
        "items": [null]
      }`);

      expect(ruleIds(file)).to.eql(["invalid-schema", "invalid-schema", "invalid-schema"]);
      expect(at("/properties/foo", root)).to.include({ type: "json-schema", dialectUri: dialectUri, location: `${baseUri}#/properties/foo` });
      expect(at("/allOf/0", root)).to.include({ type: "json-schema", dialectUri: dialectUri });
      expect(at("/items/0", root)).to.include({ type: "json-schema", dialectUri: dialectUri });
    });

    test("a value that doesn't match any shape alternative is reported and is data", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "items": 42 }`);

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["Expected a schema or an array", "https://example.com/keyword/items"]
      ]);
      expect(at("/items", root).type).to.equal("json");
    });

    test("a data alternative leaves a value that doesn't match the others to the keyword", async () => {
      const jsonSchema = testJsonSchema({ extension: { keywords: { pattern: { uri: "https://example.com/keyword/pattern", shape: { array: ["schema", "data"] } } } } });
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "${dialectUri}", "pattern": [{}, "*", 42] }`);

      expect(file.messages).to.eql([]);
      expect(at("/pattern/0", root).type).to.equal("json-schema");
      expect(at("/pattern/1", root).type).to.equal("json");
      expect(at("/pattern/2", root).type).to.equal("json");
    });

    test("a document root that isn't a schema", async () => {
      const { root, file } = await resolve(jsonSchema, `[{ "$schema": "${dialectUri}" }]`);

      expect(ruleIds(file)).to.eql(["invalid-schema"]);
      expect(root.type).to.equal("json");
      expect(at("/0", root).type).to.equal("json");
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

      expect(document).to.include({ type: "json-schema-document", uri: baseUri, dialectUri: dialectUri, mediaType: "application/schema+json" });
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

    test("a schema can't be identified by a file", async () => {
      const { file, document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$id": "file:///folder/root.json",
        "$defs": {
          "foo": { "$id": "file:///folder/foo.json" }
        }
      }`);

      expect(ruleIds(file)).to.eql(["file-uri-not-allowed", "file-uri-not-allowed"]);
      expect(document.uri).to.equal(baseUri);
    });

    // A file is where a schema is, not what it is
    test("a schema retrieved from a file can't be identified by one either", async () => {
      const { file, document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$id": "file:///folder/root.json"
      }`, { uri: "file:///other/schema.json" });

      expect(file.messages.map((message) => [message.ruleId, message.reason])).to.eql([
        ["file-uri-not-allowed", "'file:///folder/root.json' identifies the schema by a 'file:' URI. Give it an absolute URI that isn't a file, or no identifier."]
      ]);
      expect(document.uri).to.equal("file:///other/schema.json");
    });

    test("a relative $id that resolves to a file isn't allowed", async () => {
      const { file, document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": { "foo": { "$id": "foo.json" } }
      }`, { uri: "file:///folder/schema.json" });

      expect(file.messages.map((message) => message.reason)).to.eql([
        "'foo.json' identifies the schema by a 'file:' URI. Give it an absolute URI that isn't a file, or no identifier."
      ]);
      expect(Object.keys(document.embedded)).to.eql(["file:///folder/schema.json"]);
    });

    test("a relative $id under an identifier that isn't a file", async () => {
      const { file, document } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$id": "https://example.com/schema",
        "$defs": { "foo": { "$id": "foo" } }
      }`, { uri: "file:///folder/schema.json" });

      expect(ruleIds(file)).to.eql([]);
      expect(Object.keys(document.embedded)).to.eql(["https://example.com/schema", "https://example.com/foo"]);
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

    // Relative to the working directory, so it doesn't reveal where the file is
    test("a duplicate anchor in a file is said relative to the working directory", async () => {
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${dialectUri}",
        "$defs": {
          "foo": { "$anchor": "foo" },
          "bar": { "$anchor": "foo" }
        }
      }`, { path: "/folder/root.json" });

      expect(file.messages.map((message) => message.reason)).to.eql([`The 'foo' anchor is already defined in '${relative(cwd(), "/folder/root.json")}'`]);
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
      const jsonSchema = testJsonSchema({ config: { defaultDialectUri: dialectUri } });
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
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "test:/does-not-exist" }`);

      expect(ruleIds(file)).to.eql(["unknown-dialect"]);
      expect(root.type).to.equal("json");
    });

    test("a dialect that's a file", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": "file:///folder/meta.schema.json" }`);

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["The 'file:///folder/meta.schema.json' dialect is a 'file:' URI, which only finds the file on this machine. Use the URI its meta-schema's '$id' identifies it with.", "file-uri-not-allowed"]
      ]);
      expect(root.type).to.equal("json");
    });

    test("$schema that isn't a string", async () => {
      const { root, file } = await resolve(jsonSchema, `{ "$schema": 42 }`, { dialectUri });

      expect(ruleIds(file)).to.eql(["invalid-dialect"]);
      expect(root.type).to.equal("json");
    });

    describe("from $vocabulary", () => {
      /** @type (name: string, vocabularies: Record<string, boolean>) => string */
      const metaSchema = (name, vocabularies) => {
        return serve(name, { $schema: dialectUri, $vocabulary: vocabularies });
      };

      /** @type (error: unknown) => string */
      const causes = (error) => {
        if (error instanceof SchemaError) {
          return error.messages.map((message) => `${message.message} ${causes(message.cause)}`).join(" ");
        }
        return error instanceof Error ? `${error.message} ${causes(error.cause)}` : "";
      };

      test("the dialect is built from the vocabularies", async () => {
        const uri = metaSchema("meta", {
          "https://example.com/vocab/core": true,
          "https://example.com/vocab/optional": false
        });
        const { root, file } = await resolve(jsonSchema, `{ "$schema": "${uri}", "$defs": { "foo": {} } }`);

        expect(file.messages).to.eql([]);
        expect(keywordNode(root, "$defs").keywordUri).to.equal("https://example.com/keyword/defs");
        expect(at("/$defs/foo", root).type).to.equal("json-schema");
      });

      test("a required vocabulary that isn't supported", async () => {
        const uri = metaSchema("required", { "https://example.com/vocab/required": true });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("https://example.com/vocab/required");
      });

      test("a meta-schema that isn't a schema isn't used", async () => {
        const uri = serve("meta", { $vocabulary: { "https://example.com/vocab/core": true } }, "application/json");
        const { root, file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("isn't a schema");
        expect(root.type).to.equal("json");
      });

      test("the meta-schema records the dialect it defines", async () => {
        const { document, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$vocabulary": { "https://example.com/vocab/core": true, "https://example.com/vocab/optional": false, "https://example.com/vocab/other": 42 }
        }`);

        // A value that isn't a boolean is ignored, though its check reports it
        expect(ruleIds(file)).to.eql([vocabularyKeyword.uri]);
        expect(document.definedDialect).to.eql({
          keywords: { $id: idKeyword.uri, $defs: "https://example.com/keyword/defs" },
          unknownKeywords: "annotation",
          formats: {},
          assertFormats: false
        });
      });

      test("a required vocabulary that isn't supported is a problem with the meta-schema", async () => {
        const { document, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$vocabulary": { "https://example.com/vocab/required": true }
        }`);

        expect(ruleIds(file)).to.eql([vocabularyKeyword.uri]);
        expect(file.messages[0].reason).to.contain("https://example.com/vocab/required");
        expect(document.definedDialect).to.equal(undefined);
      });

      test("a defined dialect can't have x- keywords", async () => {
        const keywordUri = "https://example.com/keyword/define-reserved";
        const jsonSchema = testJsonSchema({
          extension: {
            keywords: {
              defineReserved: {
                uri: keywordUri,
                shape: "data",
                resolve: (_valueNode, context) => {
                  context.defineDialect({ keywords: { "x-foo": "https://example.com/keyword/foo" }, unknownKeywords: "annotation" });
                }
              }
            }
          }
        });
        const { document, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "defineReserved": true
        }`);

        expect(ruleIds(file)).to.eql([keywordUri]);
        expect(document.definedDialect).to.equal(undefined);
      });

      test("an embedded resource can define a dialect", async () => {
        const { document, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$defs": {
            "meta": { "$id": "meta", "$vocabulary": { "https://example.com/vocab/core": true } }
          }
        }`);

        expect(file.messages).to.eql([]);
        expect(document.definedDialect).to.equal(undefined);
        expect(document.embedded["https://example.com/meta"].definedDialect).to.include({ unknownKeywords: "annotation" });
      });

      test("a dialect can only be defined where a schema resource starts", async () => {
        const { document, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$defs": {
            "foo": { "$vocabulary": { "https://example.com/vocab/core": true } }
          }
        }`);

        expect(ruleIds(file)).to.eql([vocabularyKeyword.uri]);
        expect(Object.values(document.embedded).map((resource) => resource.definedDialect)).to.eql([undefined]);
      });

      test("a self-describing meta-schema's dialect has to be added", { timeout: 2000 }, async () => {
        const uri = serve("self", { $schema: "test:/self", $vocabulary: { "https://example.com/vocab/core": true } });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("describes itself");
      });

      test("meta-schemas that depend on each other", { timeout: 2000 }, async () => {
        const aUri = serve("a", { $schema: "test:/b", $vocabulary: { "https://example.com/vocab/core": true } });
        serve("b", { $schema: aUri, $vocabulary: { "https://example.com/vocab/core": true } });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${aUri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);

        expect(causes(file.messages[0])).to.contain("depend on each other");
      });

      test("a meta-schema without $vocabulary", async () => {
        const uri = serve("none", { $schema: dialectUri });
        const { file } = await resolve(jsonSchema, `{ "$schema": "${uri}" }`);

        expect(ruleIds(file)).to.eql(["unknown-dialect"]);
        expect(causes(file.messages[0])).to.contain("doesn't define a dialect");
      });

      test("a self-describing meta-schema doesn't replace a dialect that's already defined", async () => {
        const dialect = jsonSchema.getDialect(dialectUri);
        const { root, file } = await resolve(jsonSchema, `{
          "$schema": "${dialectUri}",
          "$vocabulary": { "https://example.com/vocab/core": true }
        }`, { uri: dialectUri });

        expect(file.messages).to.eql([]);
        expect(root).to.include({ type: "json-schema", dialectUri: dialectUri });
        expect(jsonSchema.getDialect(dialectUri)).to.equal(dialect);
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

    test("a $ref written as a file: URI is reported and doesn't replace the schema", async () => {
      const { root, file } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$ref": "file:///folder/a.schema.json" } }
      }`);

      expect(file.messages.map(({ reason, ruleId }) => [reason, ruleId])).to.eql([
        ["The reference to 'file:///folder/a.schema.json' is a 'file:' URI, which only finds the file on this machine. Use a reference relative to the schema.", "file-uri-not-allowed"]
      ]);
      expect(at("/definitions/a", root).type).to.equal("json-schema");
    });

    test("an invalid $id is reported", async () => {
      const { file } = await resolve(jsonSchema, `{
        "$schema": "${legacyDialectUri}",
        "definitions": { "a": { "$id": "http://[bad" } }
      }`);

      expect(ruleIds(file)).to.eql([legacyIdKeyword.uri]);
    });

    test("unknown keywords ignored because of $ref aren't reported", async () => {
      const jsonSchema = testJsonSchema({
        dialects: [{
          uri: "https://example.com/strict-legacy",
          keywords: { $ref: legacyRefKeyword.uri },
          unknownKeywords: "error"
        }]
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
      directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    });

    afterAll(async () => {
      await rm(directory, { recursive: true });
    });

    test("a .schema.json file is a schema", async () => {
      const session = jsonSchema.session();
      const uri = await schemaFile("main.schema.json", {
        $schema: dialectUri,
        $defs: { foo: { $anchor: "foo", type: "string" } }
      });

      const foo = await session.get(`${uri}#foo`);
      expect(foo).to.include({ type: "json-schema", location: `${uri}#/$defs/foo` });
    });

    test("references between embedded resources", async () => {
      const session = jsonSchema.session();
      const uri = await schemaFile("embedded.schema.json", {
        $schema: legacyDialectUri,
        properties: { foo: { $ref: "https://example.com/a" } },
        definitions: {
          a: { $id: "https://example.com/a", properties: { b: { $ref: "b" } } },
          b: { $id: "https://example.com/b", type: "string" }
        }
      });

      const a = await session.get(`${uri}#/properties/foo`);
      expect(a.location).to.equal("https://example.com/a#");

      const b = await jrefStep(session, "b", await jrefStep(session, "properties", a));
      expect(b.location).to.equal("https://example.com/b#");
    });

    test("an embedded resource can reference the document that embeds it", async () => {
      const session = jsonSchema.session();
      const uri = await schemaFile("embedding.schema.json", {
        $schema: legacyDialectUri,
        $id: "https://example.com/embedding",
        properties: { foo: { $ref: "https://example.com/c" } },
        definitions: {
          c: { $id: "https://example.com/c", properties: { root: { $ref: "embedding#/definitions/d" } } },
          d: { type: "string" }
        }
      });

      const c = await session.get(`${uri}#/properties/foo`);
      const d = await jrefStep(session, "root", await jrefStep(session, "properties", c));
      expect(d.location).to.equal("https://example.com/embedding#/definitions/d");
    });

    test("an embedded resource isn't visible outside the document that embeds it", async () => {
      const session = jsonSchema.session();
      const embeddedUri = "https://example.com/embedded-only";
      const uri = await schemaFile("embeds-a-file.schema.json", {
        $schema: legacyDialectUri,
        definitions: { e: { $id: embeddedUri, type: "string" } }
      });

      await session.get(uri);
      expect((await session.getDocument(embeddedUri, { referencedFrom: uri })).uri).to.equal(embeddedUri);
      await expect(session.get(embeddedUri)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a schema with problems can't be retrieved", async () => {
      const session = jsonSchema.session();
      const uri = await schemaFile("invalid.schema.json", { type: "string" });

      await expect(session.get(uri)).rejects.toMatchObject({
        messages: [{ ruleId: "missing-dialect", severity: "error", uri: uri }]
      });
    });

    test("every problem in a schema is in the error", async () => {
      const session = jsonSchema.session();
      const path = join(directory, "problems.schema.json");
      await writeFile(path, `{
  "$schema": "${dialectUri}",
  "$id": "https://example.com/problems#foo",
  "$defs": { "a": "foo", },
}`);
      const uri = pathToFileURL(path).toString();

      await expect(session.get(uri)).rejects.toMatchObject({
        messages: [
          { source: "json", ruleId: "trailing-comma", severity: "error", uri: uri, place: { start: { line: 4, column: 24 } } },
          { source: "json", ruleId: "trailing-comma", place: { start: { line: 4, column: 27 } } },
          { source: "json-schema", ruleId: idKeyword.uri, place: { start: { line: 3, column: 10 } } },
          { source: "json-schema", ruleId: "invalid-schema", place: { start: { line: 4, column: 19 } } }
        ]
      });
    });
  });
});

/** @type Keyword<any, any, any>[] */
const testKeywords = [
  idKeyword,
  anchorKeyword,
  dynamicAnchorKeyword,
  legacyIdKeyword,
  legacyRefKeyword,
  recursiveAnchorKeyword,
  vocabularyKeyword,
  { uri: "https://example.com/keyword/defs", shape: { map: "schema" } },
  { uri: "https://example.com/keyword/properties", shape: { map: "schema" } },
  { uri: "https://example.com/keyword/allOf", shape: { array: "schema" } },
  { uri: "https://example.com/keyword/items", shape: ["schema", { array: "schema" }] },
  { uri: "https://example.com/keyword/type", shape: "data" },
  { uri: "https://example.com/keyword/const", shape: "data" },
  { uri: "https://example.com/keyword/ref", shape: "reference" },
  { uri: "https://example.com/keyword/contentSchema", shape: "unappliedSchema" }
];

/**
 * The test dialects name their keywords by URI. Their definitions are in
 * `testKeywords`.
 *
 * @type DialectConfig
 */
const testDialect = {
  uri: dialectUri,
  keywords: {
    $id: idKeyword.uri,
    $anchor: anchorKeyword.uri,
    $dynamicAnchor: dynamicAnchorKeyword.uri,
    $recursiveAnchor: recursiveAnchorKeyword.uri,
    $vocabulary: vocabularyKeyword.uri,
    $defs: "https://example.com/keyword/defs",
    properties: "https://example.com/keyword/properties",
    allOf: "https://example.com/keyword/allOf",
    items: "https://example.com/keyword/items",
    type: "https://example.com/keyword/type",
    const: "https://example.com/keyword/const",
    $ref: "https://example.com/keyword/ref",
    contentSchema: "https://example.com/keyword/contentSchema"
  },
  unknownKeywords: "annotation",
  vocabularies: {
    "https://example.com/vocab/core": { keywords: { $id: idKeyword.uri, $defs: "https://example.com/keyword/defs" } }
  }
};

/** @type DialectConfig */
const legacyDialect = {
  uri: legacyDialectUri,
  keywords: {
    $id: legacyIdKeyword.uri,
    $ref: legacyRefKeyword.uri,
    definitions: "https://example.com/keyword/defs",
    properties: "https://example.com/keyword/properties",
    type: "https://example.com/keyword/type"
  },
  unknownKeywords: "ignore"
};

/** @type DialectConfig */
const strictDialect = {
  uri: strictDialectUri,
  keywords: {
    $id: idKeyword.uri,
    $defs: "https://example.com/keyword/defs",
    type: "https://example.com/keyword/type"
  },
  unknownKeywords: "error"
};

/**
 * A JsonSchema with the test dialects, which can also retrieve `test:` URIs.
 * `extension` adds keywords to the main test dialect.
 *
 * @type (options?: { dialects?: DialectConfig[]; keywords?: Keyword<any, any, any>[]; extension?: DialectExtension; config?: JsonSchemaConfig }) => JsonSchema
 */
const testJsonSchema = ({ dialects = [], keywords = [], extension, config } = {}) => {
  const jsonSchema = new JsonSchema({
    allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href, "test:/"],
    ...config,
    dialects: [extension ? extendDialect(testDialect, extension) : testDialect, legacyDialect, strictDialect, ...dialects],
    keywords: [...testKeywords, ...keywords],
    uriSchemePlugins: [{ schemes: ["test"], retrieve: respond }, ...config?.uriSchemePlugins ?? []]
  });
  return jsonSchema;
};

/** What the `test:` scheme serves: a body and its media type for each URI */
const served = new Map();

/** @type (name: string, json: unknown, contentType?: string) => string */
const serve = (name, json, contentType = "application/schema+json") => {
  const uri = `test:/${name}`;
  served.set(uri, [JSON.stringify(json), contentType]);
  return uri;
};

/** @type (uri: string) => Promise<Response> */
const respond = async (uri) => {
  const resource = served.get(uri);
  if (resource === undefined) {
    throw new HttpError(new Response(null, { status: 404 }));
  }

  const [body, contentType] = resource;
  const response = new Response(body, { headers: { "Content-Type": contentType } });
  Object.defineProperty(response, "url", { value: uri });
  return response;
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
    .use(jsonSchemaResolve, { session: jsonSchema.session(), uri: path ? undefined : baseUri, ...resolveOptions });
  const document = await processor.run(processor.parse(file), file);

  return { document, file, root: /** @type JsonSchemaTolerantNode */ (document.children[0]) };
};

/** @type (pointer: string, node: JsonSchemaTolerantNode) => any */
const at = (pointer, node) => jsonPointerGet(pointer, node);

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
