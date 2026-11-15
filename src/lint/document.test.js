import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser";
import { jsonSchemaMediaTypes } from "../json-schema.js";
import { JsonSchemaHyperjump } from "../session.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { fullFormats } from "../formats/full.js";
import { documentForLint, schemaAt } from "./document.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "../schema/schema-ast.d.ts"
 * @import { LintDocument } from "./document.d.ts"
 */

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const other = "https://example.com/other";

describe("documentForLint", () => {
  test("without a session, there's no document", async () => {
    const file = new VFile({ path: "/schemas/a.schema.json" });
    expect(await documentForLint(/** @type any */ ({ type: "json-schema-document" }), file)).to.equal(undefined);
  });

  test("the schemas a reference reaches in another document are lowered", async () => {
    const document = await resolve({ $schema: draft2020, $ref: `${other}#/$defs/a` });
    const target = /** @type JsonSchemaNode */ (schemaAt(document, `${other}#/$defs/a`));

    expect(target.location).to.equal(`${other}#/$defs/a`);
    expect(document.schemas.has(target)).to.equal(false);
    expect(document.reached.get(target)?.map(({ keywordNode }) => keywordNode.children[0].value)).to.eql(["$ref"]);
  });

  test("what the other document references is followed too", async () => {
    const document = await resolve({ $schema: draft2020, $ref: `${other}#/$defs/a` });
    expect(document.found.get(`${other}#/$defs/b`)?.status).to.equal("found");
  });

  test("a reference that finds nothing", async () => {
    const document = await resolve({ $schema: draft2020, $ref: "#/$defs/nope" });
    expect(document.found.get("file:///schemas/a.schema.json#/$defs/nope")?.status).to.equal("missing");
  });

  test("the identifier of what a reference finds by where it is", async () => {
    const document = await resolve({ $schema: draft2020, $ref: "#/$defs/a", $defs: { a: { $id: "https://example.com/a" } } });
    expect(document.found.get("https://example.com/a")?.status).to.equal("found");
  });

  test("dialects and the formats they use", async () => {
    const document = await resolve({ $schema: draft2020, format: "email" });
    const dialect = document.dialects.get(draft2020);

    expect(dialect?.uri).to.equal(draft2020);
    expect(document.definitions.formats[/** @type string */ (dialect?.formats?.email)].types).to.eql(["string"]);
  });

  test("it's found once for each tree and session", async () => {
    const { tree, file } = await resolveFile({ $schema: draft2020 });
    expect(await documentForLint(tree, file)).to.equal(await documentForLint(tree, file));
  });
});

/** @type (schema: Record<string, Json>) => Promise<{ tree: JsonSchemaDocumentNode; file: VFile }> */
const resolveFile = async (schema) => {
  const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [draft202012Dialect], formats: fullFormats }) };
  const registry = new SchemaRegistry().with({
    $schema: draft2020,
    $id: other,
    $defs: { a: { $ref: "#/$defs/b" }, b: { type: "string" } }
  });
  const session = new JsonSchemaHyperjump({ ...jsonSchema, registry });

  const file = new VFile({ path: "/schemas/a.schema.json", value: JSON.stringify(schema) });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session });
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (await processor.run(processor.parse(file), file)));
  return { tree, file };
};

/** @type (schema: Record<string, Json>) => Promise<LintDocument> */
const resolve = async (schema) => {
  const { tree, file } = await resolveFile(schema);
  return /** @type LintDocument */ (await documentForLint(tree, file));
};
