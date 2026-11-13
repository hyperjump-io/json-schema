import { relative } from "node:path";
import { cwd } from "node:process";
import { describe, test, beforeEach, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "./test-linter.js";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { findSchema } from "./find-schema.js";
import { assertIri, normalizeIri } from "@hyperjump/uri";
import { fetcher, nodeTransport } from "@hyperjump/browser";

/**
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 */

describe("findSchema", () => {
  /** @type JsonSchemaSession */
  let session;

  beforeEach(() => {
    const jsonSchema = new JsonSchema({
      allowRetrieval: ["test:/", "file:///nothing-here/"],
      dialects: [v1Dialect],
      stack: nodeTransport({ schemes: { "test:": fetcher(respond) } })
    });

    const registry = new SchemaRegistry().with({
      $schema: v1DialectUri,
      $id: "https://example.com/schema",
      properties: {
        foo: { type: "string" }
      },
      $defs: {
        bar: { $anchor: "bar", type: "number" },
        embedded: { $id: "https://example.com/embedded", type: "boolean" }
      }
    });
    session = jsonSchema.session({ registry });
  });

  describe("found", () => {
    test("a document", async () => {
      const result = await findSchema(session, iri("https://example.com/schema"));
      expect(result.status).to.equal("found");
    });

    test("a JSON Pointer fragment", async () => {
      const result = await findSchema(session, iri("https://example.com/schema#/properties/foo"));
      expect(result).toMatchObject({ status: "found", node: { type: "json-schema", jsonType: "object" } });
    });

    test("an anchor", async () => {
      const result = await findSchema(session, iri("https://example.com/schema#bar"));
      expect(result).toMatchObject({ status: "found", node: { location: "https://example.com/schema#/$defs/bar" } });
    });
  });

  describe("missing", () => {
    test("a file that doesn't exist", async () => {
      const result = await findSchema(session, iri("file:///nothing-here/a.schema.json"));
      // Relative to the working directory, so it doesn't reveal where the file is
      expect(result).toMatchObject({ status: "missing", reason: { message: `'${relative(cwd(), "/nothing-here/a.schema.json")}' doesn't exist` } });
    });

    test("an HTTP resource that doesn't exist", async () => {
      expect(await findSchema(session, iri("test:/404"))).toMatchObject({ status: "missing", reason: { message: "'test:/404' can't be used, because its response's status is 404" } });
      expect((await findSchema(session, iri("test:/410"))).status).to.equal("missing");
    });

    test("a JSON Pointer that doesn't point to anything", async () => {
      const result = await findSchema(session, iri("https://example.com/schema#/properties/bar"));
      expect(result.status).to.equal("missing");
    });

    test("an anchor that doesn't exist", async () => {
      const result = await findSchema(session, iri("https://example.com/schema#baz"));
      expect(result).toMatchObject({ status: "missing", reason: { message: "There's no 'baz' anchor in 'https://example.com/schema'" } });
    });

    test("something that isn't a schema", async () => {
      const result = await findSchema(session, iri("https://example.com/schema#/properties"));
      expect(result).toMatchObject({ status: "missing", reason: { message: "'https://example.com/schema#/properties' isn't a schema" } });
    });

    test("a document that isn't a schema", async () => {
      const result = await findSchema(session, iri("test:/json"));
      expect(result).toMatchObject({ status: "missing", reason: { message: "'test:/json' isn't a schema" } });
    });
  });

  describe("unknown", () => {
    test("a URL allowRetrieval refuses", async () => {
      const result = await findSchema(session, iri("https://example.com/other"));
      expect(result).toMatchObject({ status: "unknown", reason: { cause: { code: "ERR_RETRIEVAL_NOT_ALLOWED" } } });
    });

    test("an embedded resource, from another document", async () => {
      const result = await findSchema(session, iri("https://example.com/embedded"));
      expect(result.status).to.equal("unknown");
    });

    test("an HTTP error that isn't about whether it exists", async () => {
      expect((await findSchema(session, iri("test:/500"))).status).to.equal("unknown");
      expect((await findSchema(session, iri("test:/403"))).status).to.equal("unknown");
    });

    test("an unsupported URI scheme", async () => {
      const result = await findSchema(session, iri("urn:example:schema"));
      expect(result.status).to.equal("unknown");
    });

    test("a schema with problems", async () => {
      const result = await findSchema(session, iri("test:/invalid"));
      expect(result.status).to.equal("unknown");
    });
  });

  describe("the document being linted", () => {
    /**
     * Look up each URI from a rule, referenced from the document. The file
     * doesn't exist on disk, so anything found is from the tree being
     * linted.
     *
     * @type (json: string, uris: string[]) => Promise<string[]>
     */
    const findFromLintedDocument = async (json, uris) => {
      /** @type string[] */
      const statuses = [];
      const file = new VFile({ path: "/nothing-here/a.schema.json", value: json });
      await linter()
        .use(() => async (/** @type JsonSchemaDocumentNode */ tree, file) => {
          for (const uri of uris) {
            const session = /** @type JsonSchemaSession */ (file.data.jsonSchemaSession);
            const result = await findSchema(session, iri(uri), { document: tree });
            statuses.push(result.status);
          }
        })
        .process(file);
      return statuses;
    };

    test("a JSON Pointer into it", async () => {
      const statuses = await findFromLintedDocument(`{ "$schema": "${v1DialectUri}", "$defs": { "foo": true } }`, [
        "file:///nothing-here/a.schema.json#/$defs/foo",
        "file:///nothing-here/a.schema.json#/$defs/bar"
      ]);
      expect(statuses).to.eql(["found", "missing"]);
    });

    test("without the document, the session retrieves the file, which isn't allowed here", async () => {
      /** @type string[] */
      const statuses = [];
      const file = new VFile({ path: "/nothing-here/a.schema.json", value: `{ "$schema": "${v1DialectUri}", "$defs": { "foo": true } }` });
      await linter()
        .use(() => async (/** @type JsonSchemaDocumentNode */ _tree, file) => {
          const session = /** @type JsonSchemaSession */ (file.data.jsonSchemaSession);
          const result = await findSchema(session, iri("file:///nothing-here/a.schema.json#/$defs/foo"));
          statuses.push(result.status);
        })
        .process(file);
      expect(statuses).to.eql(["unknown"]);
    });

    test("an embedded resource and its anchors", async () => {
      const statuses = await findFromLintedDocument(`{
        "$schema": "${v1DialectUri}",
        "$defs": {
          "foo": { "$id": "https://example.com/foo", "$defs": { "bar": { "$anchor": "bar" } } }
        }
      }`, [
        "https://example.com/foo",
        "https://example.com/foo#bar",
        "https://example.com/foo#baz"
      ]);
      expect(statuses).to.eql(["found", "found", "missing"]);
    });
  });
});

/**
 * `test:/` URIs stand in for a server. The path is the response: a status
 * code, `json` for a plain JSON document, or `invalid` for a schema with a
 * problem.
 *
 * @type (request: Request) => Promise<Response>
 */
const respond = async ({ url: uri }) => {
  const path = uri.slice("test:/".length);
  if (/^\d+$/.test(path)) {
    return new Response(null, { status: Number(path) });
  }

  const [body, contentType] = path === "json"
    ? [`{ "type": "string" }`, "application/json"]
    : [`{ "$schema": "${v1DialectUri}", "minLength": -1 }`, "application/schema+json"];
  const response = new Response(body, { headers: { "Content-Type": contentType } });
  Object.defineProperty(response, "url", { value: uri });
  return response;
};

/** @type (uri: string) => import("@hyperjump/uri").NormalizedIri */
const iri = (uri) => {
  assertIri(uri);
  return normalizeIri(uri);
};
