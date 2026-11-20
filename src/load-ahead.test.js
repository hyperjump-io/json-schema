import { describe, test, expect } from "vitest";
import { fetcher } from "@hyperjump/browser";
import { jsonSchemaConfig } from "./json-schema.js";
import { v1Dialect, v1DialectUri } from "./dialects/v1/index.js";
import { compile } from "./operations/compile.js";
import { lint } from "./operations/lint.js";
import { bundle } from "./operations/bundle.js";

/**
 * @import { Json } from "@hyperjump/browser"
 */

/**
 * A server of schemas that each take a moment to arrive. It counts how
 * many requests are being answered at once, and which have been answered.
 *
 * @type (schemas: Record<string, Json>) => { config: ReturnType<typeof jsonSchemaConfig>, mostAtOnce: () => number, answered: Set<string> }
 */
const slowServer = (schemas) => {
  let atOnce = 0;
  let mostAtOnce = 0;
  /** @type Set<string> */
  const answered = new Set();
  const stack = fetcher(async (request) => {
    const { pathname } = new URL(request.url);
    atOnce++;
    mostAtOnce = Math.max(mostAtOnce, atOnce);
    await new Promise((resolve) => setTimeout(resolve, 5));
    atOnce--;
    answered.add(pathname);
    if (!(pathname in schemas)) {
      return new Response("", { status: 404 });
    }
    return new Response(JSON.stringify(schemas[pathname]), { headers: { "content-type": "application/schema+json" } });
  });
  const config = jsonSchemaConfig({ dialects: [v1Dialect], stack, allowRetrieval: ["https://slow.test/"] });
  return { config, mostAtOnce: () => mostAtOnce, answered };
};

const string = { $schema: v1DialectUri, type: "string" };

describe("Loading references ahead", () => {
  test("compiling retrieves a schema's references at the same time", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, properties: { a: { $ref: "/a" }, b: { $ref: "/b" }, c: { $ref: "/c" } } },
      "/a": string,
      "/b": string,
      "/c": string
    });
    await compile(server.config, "https://slow.test/main");
    expect(server.mostAtOnce()).to.equal(3);
  });

  test("a reference's references are loaded ahead too", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, $ref: "/a" },
      "/a": { $schema: v1DialectUri, properties: { b: { $ref: "/b" }, c: { $ref: "/c" } } },
      "/b": string,
      "/c": string
    });
    await compile(server.config, "https://slow.test/main");
    expect(server.mostAtOnce()).to.equal(2);
  });

  test("compiling returns when what it loaded ahead is done, even what it didn't need", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, type: "string", $defs: { unused: { $ref: "/unused" } } },
      "/unused": { $schema: v1DialectUri, $ref: "/unused-too" },
      "/unused-too": string
    });
    await compile(server.config, "https://slow.test/main");
    expect(server.answered).to.deep.equal(new Set(["/main", "/unused", "/unused-too"]));
  });

  test("a reference that fails isn't an error if compiling doesn't follow it", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, type: "string", $defs: { unused: { $ref: "/missing" } } }
    });
    await expect(compile(server.config, "https://slow.test/main")).resolves.toBeDefined();
    expect(server.answered.has("/missing")).to.equal(true);
  });

  test("a reference that fails is the same error when compiling follows it", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, $ref: "/missing" }
    });
    await expect(compile(server.config, "https://slow.test/main")).rejects.toMatchObject({ cause: { code: "ERR_HTTP_STATUS", status: 404 } });
  });

  test("linting retrieves a schema's references at the same time", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, properties: { a: { $ref: "/a" }, b: { $ref: "/b" } } },
      "/a": string,
      "/b": string
    });
    await lint(server.config, "https://slow.test/main");
    expect(server.mostAtOnce()).to.equal(2);
  });

  test("bundling retrieves a schema's references at the same time", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, properties: { a: { $ref: "/a" }, b: { $ref: "/b" } } },
      "/a": string,
      "/b": string
    });
    await bundle(server.config, "https://slow.test/main");
    expect(server.mostAtOnce()).to.equal(2);
  });

  test("bundling doesn't load an external schema ahead", async () => {
    const server = slowServer({
      "/main": { $schema: v1DialectUri, properties: { a: { $ref: "/a" }, b: { $ref: "/external" } } },
      "/a": string,
      "/external": string
    });
    await bundle(server.config, "https://slow.test/main", { externalSchemas: ["https://slow.test/external"] });
    expect(server.answered.has("/external")).to.equal(false);
  });
});
