import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { pointerGet, rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { addDraft07 } from "../dialects/draft-07/index.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";
import { isNegated, schemaGroup } from "./schema-group.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { SchemaGroup } from "./schema-group.d.ts"
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const keyword = "https://json-schema.org/keyword";
const opaqueDialect = "https://example.com/opaque-dialect";

/** @type (schema: Record<string, Json>) => Promise<{ session: JsonSchemaSession; tree: JsonSchemaDocumentNode; at: (pointer: string) => JsonSchemaNode }> */
const resolve = async (schema) => {
  const jsonSchema = new JsonSchema();
  addDraft07(jsonSchema);
  addDraft202012(jsonSchema);

  // Applies schemas, in order, until one passes. It's `opaque`, so where
  // its schemas apply isn't known.
  jsonSchema.addKeyword({
    uri: "https://example.com/keyword/firstOf",
    shape: { array: "schema" },
    lower: (schemas) => ({ op: "opaque", keyword: "https://example.com/keyword/firstOf", value: null, schemas }),
    evaluate: () => () => true
  });
  jsonSchema.addKeyword({
    uri: "https://example.com/keyword/opaqueRef",
    shape: "reference",
    lower: (reference) => ({ op: "opaque", keyword: "https://example.com/keyword/opaqueRef", value: null, schemas: [reference.schema] }),
    evaluate: () => () => true
  });
  jsonSchema.addDialect({
    uri: opaqueDialect,
    keywords: {
      $defs: `${keyword}/definitions`,
      $ref: `${keyword}/ref`,
      allOf: `${keyword}/allOf`,
      firstOf: "https://example.com/keyword/firstOf",
      opaqueRef: "https://example.com/keyword/opaqueRef"
    },
    unknownKeywords: "annotation"
  });

  const registry = new SchemaRegistry().with({
    $schema: draft2020,
    $id: "https://example.com/other",
    allOf: [{ properties: { a: {} } }],
    $defs: { b: { properties: { b: {} } } }
  });
  const session = jsonSchema.session({ registries: [registry] });

  const file = new VFile({ path: "/schemas/a.schema.json", value: JSON.stringify(schema) });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  const root = /** @type JsonSchemaNode */ (tree.children[0]);
  return { session, tree, at: (pointer) => /** @type JsonSchemaNode */ (pointerGet(pointer, root)) };
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

describe("schemaGroup", () => {
  test("schemas applied in place, in both directions", async () => {
    const { session, tree, at } = await resolve({
      $schema: draft2020,
      properties: { foo: { anyOf: [{ required: ["a"] }, { not: {} }] } }
    });
    const group = await schemaGroup(session, tree, at("/properties/foo/anyOf/0"));

    expect(locations(group)).to.eql(["#/properties/foo", "#/properties/foo/anyOf/0", "#/properties/foo/anyOf/1", "#/properties/foo/anyOf/1/not"]);
    expect(group.links).to.have.length(3);
    expect(group.open).to.equal(false);
    expect(group.applied).to.equal(true);
    expect(group.unknown).to.equal(false);
  });

  test("a schema in $defs that nothing references isn't applied", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, $defs: { a: { allOf: [true] } } });
    const group = await schemaGroup(session, tree, at("/$defs/a/allOf/0"));

    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(false);
  });

  test("a schema's children that apply to something else aren't in its group", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, properties: { foo: { items: {} } } });
    const group = await schemaGroup(session, tree, at("/properties/foo"));

    expect(locations(group)).to.eql(["#/properties/foo"]);
  });

  test("references, in both directions", async () => {
    const { session, tree, at } = await resolve({
      $schema: draft2020,
      properties: { foo: { $ref: "#/$defs/a" } },
      $defs: { a: { allOf: [true] } }
    });
    const group = await schemaGroup(session, tree, at("/$defs/a/allOf/0"));

    expect(locations(group)).to.eql(["#/$defs/a", "#/$defs/a/allOf/0", "#/properties/foo"]);
    expect(links(group)).to.eql(["a allOf 0", "foo ref a reference"]);
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(true);
  });

  test("a reference to another document", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, properties: { foo: { $ref: "https://example.com/other" } } });
    const group = await schemaGroup(session, tree, at("/properties/foo"));

    expect(group.schemas.map((schemaNode) => schemaNode.location)).to.eql([
      "file:///schemas/a.schema.json#/properties/foo",
      "https://example.com/other#",
      "https://example.com/other#/allOf/0"
    ]);
    expect(group.open).to.equal(false);
    expect(group.unknown).to.equal(false);
  });

  test("the root can be applied from another document", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, required: ["a"] });
    const group = await schemaGroup(session, tree, at(""));
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(true);
  });

  test("a reference that can't be followed", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, $ref: "https://example.com/nope" });
    expect((await schemaGroup(session, tree, at(""))).unknown).to.equal(true);
  });

  test("a dynamic reference", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, $dynamicAnchor: "a", $dynamicRef: "#a" });
    expect((await schemaGroup(session, tree, at(""))).unknown).to.equal(true);
  });

  test("a dynamic reference that doesn't use the dynamic scope", async () => {
    // Without a dynamic anchor named by its fragment, it's like `$ref`
    const { session, tree, at } = await resolve({ $schema: draft2020, $defs: { a: {} }, $dynamicRef: "#/$defs/a" });
    const group = await schemaGroup(session, tree, at(""));
    expect(group.unknown).to.equal(false);
    expect(locations(group)).to.eql(["#", "#/$defs/a"]);
  });

  test("without a session, nothing is linked", async () => {
    const { tree, at } = await resolve({ $schema: draft2020, $defs: { a: {} }, $ref: "#/$defs/a", allOf: [true] });
    const group = await schemaGroup(undefined, /** @type any */ ({ ...tree }), at(""));
    expect(locations(group)).to.eql(["#"]);
    expect(group.unknown).to.equal(true);
  });

  test("a draft-07 reference", async () => {
    const { session, tree, at } = await resolve({
      $schema: "http://json-schema.org/draft-07/schema#",
      definitions: { a: { type: "string" } },
      properties: { foo: { $ref: "#/definitions/a" } }
    });
    const group = await schemaGroup(session, tree, at("/properties/foo"));

    expect(locations(group)).to.eql(["#/definitions/a", "#/properties/foo"]);
    expect(group.links.map(({ keywordUri }) => keywordUri)).to.eql([`${keyword}/draft-07/ref`]);
  });

  test("which keywords apply schemas in place is found from what they lower to", async () => {
    const { session, tree, at } = await resolve({
      $schema: draft2020,
      if: true,
      then: true,
      else: true,
      not: true,
      dependentSchemas: { a: true },
      contains: true
    });
    const group = await schemaGroup(session, tree, at(""));

    // The schema `if` applies as a condition is in `if`, and the ones it
    // applies after it are in `then` and `else`
    expect(links(group)).to.eql(["# dependentSchemas a", "# else else", "# if if condition", "# not not negated", "# then then"]);
    expect(group.schemas).not.to.include(at("/contains"));
  });

  test("a `then` without an `if` isn't applied", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, then: { required: ["a"] } });
    const group = await schemaGroup(session, tree, at("/then"));

    expect(locations(group)).to.eql(["#/then"]);
    expect(group.open).to.equal(true);
    expect(group.applied).to.equal(false);
  });

  test("a schema that's only annotated isn't applied", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, contentMediaType: "application/json", contentSchema: { required: ["a"] } });
    const group = await schemaGroup(session, tree, at("/contentSchema"));

    expect(locations(group)).to.eql(["#/contentSchema"]);
    expect(group.applied).to.equal(false);
  });

  test("a reference to a schema's own definitions leaves the definition open", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, $ref: "#/$defs/a", $defs: { a: true } });
    const group = await schemaGroup(session, tree, at("/$defs/a"));

    expect(links(group)).to.eql(["# ref a reference"]);
    expect(group.open).to.equal(true);
  });

  test("where an opaque operation applies its schemas isn't known", async () => {
    const { session, tree, at } = await resolve({
      $schema: opaqueDialect,
      firstOf: [{ required: ["a"] }],
      allOf: [{ firstOf: [{ $ref: "#/$defs/a" }] }],
      $defs: { a: true }
    });

    const root = await schemaGroup(session, tree, at(""));
    expect(locations(root)).to.eql(["#", "#/allOf/0"]);
    expect(root.unknown).to.equal(false);

    // The schema isn't linked to the schema it's in
    const first = await schemaGroup(session, tree, at("/firstOf/0"));
    expect(locations(first)).to.eql(["#/firstOf/0"]);
    expect(first.open).to.equal(true);

    // What's in it is still followed
    const nested = await schemaGroup(session, tree, at("/allOf/0/firstOf/0"));
    expect(locations(nested)).to.eql(["#/$defs/a", "#/allOf/0/firstOf/0"]);
  });

  test("a reference an opaque operation applies can't be followed", async () => {
    const { session, tree, at } = await resolve({ $schema: opaqueDialect, opaqueRef: "#/$defs/a", $defs: { a: true } });
    const group = await schemaGroup(session, tree, at(""));
    expect(locations(group)).to.eql(["#"]);
    expect(group.unknown).to.equal(true);
  });

  test("every schema in a group gets the same group", async () => {
    const { session, tree, at } = await resolve({ $schema: draft2020, properties: { foo: { allOf: [true] } } });
    expect(await schemaGroup(session, tree, at("/properties/foo/allOf/0"))).to.equal(await schemaGroup(session, tree, at("/properties/foo")));
  });
  test("isNegated counts the nots a schema is applied through", async () => {
    const { session, tree, at } = await resolve({
      $schema: draft2020,
      not: { allOf: [{ not: { anyOf: [true] } }] },
      properties: { foo: { not: true } }
    });
    const group = await schemaGroup(session, tree, at(""));

    expect(isNegated(group, at(""))).to.equal(false);
    expect(isNegated(group, at("/not/allOf/0"))).to.equal(true);
    expect(isNegated(group, at("/not/allOf/0/not/anyOf/0"))).to.equal(false);
    expect(isNegated(await schemaGroup(session, tree, at("/properties/foo/not")), at("/properties/foo/not"))).to.equal(true);
  });

  test("isNegated doesn't follow references", async () => {
    // What a reference refers to can be applied from elsewhere too
    const { session, tree, at } = await resolve({ $schema: draft2020, not: { $ref: "#/$defs/a" }, $defs: { a: true } });
    const group = await schemaGroup(session, tree, at("/$defs/a"));

    expect(isNegated(group, at("/not"))).to.equal(true);
    expect(isNegated(group, at("/$defs/a"))).to.equal(false);
  });
});
