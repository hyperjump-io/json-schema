import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { jsonPointerGet, rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft07Dialect } from "../dialects/draft-07/index.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { documentForLint } from "./document.js";
import { isNegated, schemaGroup } from "./schema-group.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 * @import { SchemaGroup } from "./schema-group.d.ts"
 * @import { Expression } from "../kernel/kernel.d.ts"
 * @import { Reference } from "../keyword.d.ts"
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const keyword = "https://json-schema.org/keyword";
const opaqueDialect = "https://example.com/opaque-dialect";

describe("schemaGroup", () => {
  test("schemas applied in place, in both directions", async () => {
    const { document, at } = await resolve({
      $schema: draft2020,
      properties: { foo: { anyOf: [{ required: ["a"] }, { not: {} }] } }
    });
    const group = schemaGroup(document, at("/properties/foo/anyOf/0"));

    expect(locations(group)).to.eql(["#/properties/foo", "#/properties/foo/anyOf/0", "#/properties/foo/anyOf/1", "#/properties/foo/anyOf/1/not"]);
    expect(group.links).to.have.length(3);
    expect(group.open).to.equal(false);
    expect(group.applied).to.equal(true);
    expect(group.unknown).to.equal(false);
  });

  test("a schema in $defs that nothing references isn't applied", async () => {
    const { document, at } = await resolve({ $schema: draft2020, $defs: { a: { allOf: [true] } } });
    const group = schemaGroup(document, at("/$defs/a/allOf/0"));

    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(false);
  });

  test("a schema's children that apply to something else aren't in its group", async () => {
    const { document, at } = await resolve({ $schema: draft2020, properties: { foo: { items: {} } } });
    const group = schemaGroup(document, at("/properties/foo"));

    expect(locations(group)).to.eql(["#/properties/foo"]);
  });

  test("references, in both directions", async () => {
    const { document, at } = await resolve({
      $schema: draft2020,
      properties: { foo: { $ref: "#/$defs/a" } },
      $defs: { a: { allOf: [true] } }
    });
    const group = schemaGroup(document, at("/$defs/a/allOf/0"));

    expect(locations(group)).to.eql(["#/$defs/a", "#/$defs/a/allOf/0", "#/properties/foo"]);
    expect(links(group)).to.eql(["a allOf 0", "foo ref a reference"]);
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(true);
  });

  test("a reference to another document", async () => {
    const { document, at } = await resolve({ $schema: draft2020, properties: { foo: { $ref: "https://example.com/other" } } });
    const group = schemaGroup(document, at("/properties/foo"));

    expect(group.schemas.map((schemaNode) => schemaNode.location)).to.eql([
      "file:///schemas/a.schema.json#/properties/foo",
      "https://example.com/other#",
      "https://example.com/other#/allOf/0"
    ]);
    expect(group.open).to.equal(false);
    expect(group.unknown).to.equal(false);
  });

  test("the root can be applied from another document", async () => {
    const { document, at } = await resolve({ $schema: draft2020, required: ["a"] });
    const group = schemaGroup(document, at(""));
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(true);
  });

  test("a reference that can't be followed", async () => {
    const { document, at } = await resolve({ $schema: draft2020, $ref: "https://example.com/nope" });
    expect(schemaGroup(document, at("")).unknown).to.equal(true);
  });

  test("a dynamic reference", async () => {
    const { document, at } = await resolve({ $schema: draft2020, $dynamicAnchor: "a", $dynamicRef: "#a" });
    expect(schemaGroup(document, at("")).unknown).to.equal(true);
  });

  test("a dynamic reference that doesn't use the dynamic scope", async () => {
    // Without a dynamic anchor named by its fragment, it's like `$ref`
    const { document, at } = await resolve({ $schema: draft2020, $defs: { a: {} }, $dynamicRef: "#/$defs/a" });
    const group = schemaGroup(document, at(""));
    expect(group.unknown).to.equal(false);
    expect(locations(group)).to.eql(["#", "#/$defs/a"]);
  });

  test("a draft-07 reference", async () => {
    const { document, at } = await resolve({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: { a: { type: "string" } },
      properties: { foo: { $ref: "#/definitions/a" } }
    });
    const group = schemaGroup(document, at("/properties/foo"));

    expect(locations(group)).to.eql(["#/definitions/a", "#/properties/foo"]);
    expect(group.links.map(({ keywordUri }) => keywordUri)).to.eql([`${keyword}/draft-07/ref`]);
  });

  test("a draft-07 reference that isn't normalized", async () => {
    const { document, at } = await resolve({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: { a: { type: "string" } },
      properties: { foo: { $ref: "#/definitions/%61" } }
    });
    const group = schemaGroup(document, at("/properties/foo"));

    expect(locations(group)).to.eql(["#/definitions/a", "#/properties/foo"]);
  });

  test("a draft-07 reference that isn't normalized, in place", async () => {
    const { document, at } = await resolve({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: { a: { type: "string" } },
      allOf: [{ $ref: "#/definitions/%61" }]
    });

    const group = schemaGroup(document, at(""));
    /** @type (location: string) => string */
    const fragment = (location) => location.slice(location.indexOf("#"));

    expect(locations(group)).to.eql(["#", "#/allOf/0", "#/definitions/a"]);
    expect(group.links.map(({ from, to, reference }) => [fragment(from.location), fragment(to.location), reference])).to.eql([
      ["#", "#/allOf/0", false],
      ["#/allOf/0", "#/definitions/a", true]
    ]);
  });

  test("which keywords apply schemas in place is found from what they lower to", async () => {
    const { document, at } = await resolve({
      $schema: draft2020,
      if: true,
      then: true,
      else: true,
      not: true,
      dependentSchemas: { a: true },
      contains: true
    });
    const group = schemaGroup(document, at(""));

    // The schema `if` applies as a condition is in `if`, and the ones it
    // applies after it are in `then` and `else`
    expect(links(group)).to.eql(["# dependentSchemas a", "# else else", "# if if condition", "# not not negated", "# then then"]);
    expect(group.schemas).not.to.include(at("/contains"));
  });

  test("a `then` without an `if` isn't applied", async () => {
    const { document, at } = await resolve({ $schema: draft2020, then: { required: ["a"] } });
    const group = schemaGroup(document, at("/then"));

    expect(locations(group)).to.eql(["#/then"]);
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(false);
  });

  test("a schema that's only annotated isn't applied", async () => {
    const { document, at } = await resolve({ $schema: draft2020, contentMediaType: "application/json", contentSchema: { required: ["a"] } });
    const group = schemaGroup(document, at("/contentSchema"));

    expect(locations(group)).to.eql(["#/contentSchema"]);
    expect(group.applied).to.equal(false);
  });

  test("a reference to a schema's own definitions leaves the definition open", async () => {
    const { document, at } = await resolve({ $schema: draft2020, $ref: "#/$defs/a", $defs: { a: true } });
    const group = schemaGroup(document, at("/$defs/a"));

    expect(links(group)).to.eql(["# ref a reference"]);
    expect(group.open).to.equal(true);
  });

  test("where an opaque operation applies its schemas isn't known", async () => {
    const { document, at } = await resolve({
      $schema: opaqueDialect,
      firstOf: [{ required: ["a"] }],
      allOf: [{ firstOf: [{ $ref: "#/$defs/a" }] }],
      $defs: { a: true }
    });

    const root = schemaGroup(document, at(""));
    expect(locations(root)).to.eql(["#", "#/allOf/0"]);
    expect(root.unknown).to.equal(false);

    // The schema isn't linked to the schema it's in
    const first = schemaGroup(document, at("/firstOf/0"));
    expect(locations(first)).to.eql(["#/firstOf/0"]);
    expect(first.open).to.equal(true);

    // What's in it is still followed
    const nested = schemaGroup(document, at("/allOf/0/firstOf/0"));
    expect(locations(nested)).to.eql(["#/$defs/a", "#/allOf/0/firstOf/0"]);
  });

  test("a reference an opaque operation applies can't be followed", async () => {
    const { document, at } = await resolve({ $schema: opaqueDialect, opaqueRef: "#/$defs/a", $defs: { a: true } });
    const group = schemaGroup(document, at(""));
    expect(locations(group)).to.eql(["#"]);
    expect(group.unknown).to.equal(true);
  });

  test("every schema in a group gets the same group", async () => {
    const { document, at } = await resolve({ $schema: draft2020, properties: { foo: { allOf: [true] } } });
    expect(schemaGroup(document, at("/properties/foo/allOf/0"))).to.equal(schemaGroup(document, at("/properties/foo")));
  });
  test("isNegated counts the nots a schema is applied through", async () => {
    const { document, at } = await resolve({
      $schema: draft2020,
      not: { allOf: [{ not: { anyOf: [true] } }] },
      properties: { foo: { not: true } }
    });
    const group = schemaGroup(document, at(""));

    expect(isNegated(group, at(""))).to.equal(false);
    expect(isNegated(group, at("/not/allOf/0"))).to.equal(true);
    expect(isNegated(group, at("/not/allOf/0/not/anyOf/0"))).to.equal(false);
    expect(isNegated(schemaGroup(document, at("/properties/foo/not")), at("/properties/foo/not"))).to.equal(true);
  });

  test("isNegated doesn't follow references", async () => {
    // What a reference refers to can be applied from elsewhere too
    const { document, at } = await resolve({ $schema: draft2020, not: { $ref: "#/$defs/a" }, $defs: { a: true } });
    const group = schemaGroup(document, at("/$defs/a"));

    expect(isNegated(group, at("/not"))).to.equal(true);
    expect(isNegated(group, at("/$defs/a"))).to.equal(false);
  });
});

/** @type (schema: Record<string, Json>) => Promise<{ document: LintDocument; at: (pointer: string) => JsonSchemaNode }> */
const resolve = async (schema) => {
  const jsonSchema = jsonSchemaConfig({
    dialects: [draft07Dialect, draft202012Dialect, {
      uri: opaqueDialect,
      keywords: {
        $defs: `${keyword}/definitions`,
        $ref: `${keyword}/ref`,
        allOf: `${keyword}/allOf`,
        // Applies schemas, in order, until one passes. It's `opaque`, so
        // where its schemas apply isn't known.
        firstOf: {
          uri: "https://example.com/keyword/firstOf",
          shape: { array: "schema" },
          lower: (/** @type Expression[] */ schemas) => ({ op: "opaque", keyword: "https://example.com/keyword/firstOf", value: null, schemas }),
          evaluate: () => () => true
        },
        opaqueRef: {
          uri: "https://example.com/keyword/opaqueRef",
          shape: "reference",
          lower: (/** @type Reference */ reference) => ({ op: "opaque", keyword: "https://example.com/keyword/opaqueRef", value: null, schemas: [reference.schema] }),
          evaluate: () => () => true
        }
      },
      unknownKeywords: "annotation"
    }]
  });

  const registry = new SchemaRegistry().with({
    $schema: draft2020,
    $id: "https://example.com/other",
    allOf: [{ properties: { a: {} } }],
    $defs: { b: { properties: { b: {} } } }
  });
  const session = new Hyperjump({ ...jsonSchema, registry });

  const file = new VFile({ path: "/schemas/a.schema.json", value: JSON.stringify(schema) });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  const root = /** @type JsonSchemaNode */ (tree.children[0]);
  const document = /** @type LintDocument */ (await documentForLint(tree, file));
  return { document, at: (pointer) => /** @type JsonSchemaNode */ (jsonPointerGet(pointer, root)) };
};

/** @type (group: SchemaGroup) => string[] */
const locations = (group) => group.schemas.map((schemaNode) => schemaNode.location.replace(/^.*#/, "#")).sort();

/** @type (group: SchemaGroup) => string[] */
const links = (group) => group.links
  .map(({ from, to, keywordUri, reference, negated, condition }) => {
    const flags = [reference && "reference", negated && "negated", condition && "condition"].filter(Boolean);
    /** @type (node: JsonSchemaNode) => string */
    const name = (node) => node.location.replace(/^.*\/(.*#)?/, "") || "#";
    return [name(from), keywordUri.replace(`${keyword}/`, ""), name(to), ...flags].join(" ");
  })
  .sort();
