import { describe, test, expect } from "vitest";
import { fetcher } from "@hyperjump/browser";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { compile } from "../operations/compile.js";
import { get, getDocument } from "../session.js";
import { isSchemaDocument, isSchemaNode } from "./schema-nodes.js";

describe("what a session finds that isn't a schema", () => {
  /** What each URL serves: a body and its media type */
  const served = new Map([
    ["https://example.com/schema", [`{ "$schema": "${v1DialectUri}", "properties": { "a": true } }`, "application/schema+json"]],
    ["https://example.com/json", [`{ "type": "string" }`, "application/json"]],
    ["https://example.com/number", [`42`, "application/json"]],
    ["https://example.com/jref", [`{ "type": "string" }`, "application/reference+json"]]
  ]);
  const stack = fetcher((request) => {
    const [body, contentType] = /** @type [string, string] */ (served.get(request.url));
    return new Response(body, { headers: { "content-type": contentType } });
  });
  const jsonSchema = new JsonSchema({ dialects: [v1Dialect], allowRetrieval: ["https://example.com/"], stack });

  test("isSchemaNode is only true for a schema", async () => {
    const session = jsonSchema.session();

    expect(isSchemaNode(await get(session, "https://example.com/schema"))).to.equal(true);
    expect(isSchemaNode(await get(session, "https://example.com/schema#/properties/a"))).to.equal(true);
    expect(isSchemaNode(await get(session, "https://example.com/schema#/properties")), "a value in a schema").to.equal(false);
    expect(isSchemaNode(await get(session, "https://example.com/json"))).to.equal(false);
    expect(isSchemaNode(await get(session, "https://example.com/jref"))).to.equal(false);
    expect(isSchemaNode(undefined)).to.equal(false);
  });

  test("isSchemaDocument is only true for a schema document", async () => {
    const session = jsonSchema.session();

    expect(isSchemaDocument(await getDocument(session, "https://example.com/schema"))).to.equal(true);
    expect(isSchemaDocument(await getDocument(session, "https://example.com/json"))).to.equal(false);
    expect(isSchemaDocument(await getDocument(session, "https://example.com/jref"))).to.equal(false);
  });

  test.each(["json", "number", "jref", "schema#/properties"])("a reference to %s isn't compiled", async (target) => {
    const registry = new SchemaRegistry().with({ $schema: v1DialectUri, $id: "https://example.com/main", $ref: `https://example.com/${target}` });

    await expect(compile(jsonSchema, "https://example.com/main", { registry })).rejects.toThrow(`'https://example.com/${target}' isn't a schema`);
  });
});
