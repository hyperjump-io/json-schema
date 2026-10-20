import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, afterEach, expect, vi } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { JsonSchema, RetrievalNotAllowedError } from "../json-schema.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { defaultAllowRetrieval } from "./allow-retrieval.js";
import * as BrowserRetrieval from "./allow-retrieval.browser.js";

/**
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/** @type (config?: JsonSchemaConfig) => JsonSchema */
const v1 = (config) => {
  const jsonSchema = new JsonSchema(config);
  addV1(jsonSchema);
  return jsonSchema;
};

const schema = JSON.stringify({ $schema: v1DialectUri, type: "string" });

describe("allowRetrieval", () => {
  /** A directory in the working directory, which the default allows */
  let inside = "";

  /** A directory outside the working directory, which the default refuses */
  let outside = "";

  beforeAll(async () => {
    inside = await mkdtemp(join(cwd(), ".allow-retrieval-test-"));
    outside = await mkdtemp(join(tmpdir(), "json-schema-next-"));
    await writeFile(join(inside, "inside.schema.json"), schema);
    await writeFile(join(outside, "outside.schema.json"), schema);
    await symlink(join(outside, "outside.schema.json"), join(inside, "link.schema.json"));
    await symlink(outside, join(inside, "linked-directory"));
    await writeFile(join(inside, "refers-outside.schema.json"), JSON.stringify({
      $schema: v1DialectUri,
      $ref: pathToFileURL(join(outside, "outside.schema.json")).href
    }));
  });

  afterAll(async () => {
    await rm(inside, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  describe("the default in Node.js", () => {
    test("a file in the working directory is allowed", async () => {
      const validator = await v1().compile(pathToFileURL(join(inside, "inside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("a file outside the working directory is refused", async () => {
      const uri = pathToFileURL(join(outside, "outside.schema.json")).href;
      const error = await v1().compile(uri)
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(RetrievalNotAllowedError);
      expect(error).not.to.be.instanceOf(RetrievalError);
      expect(/** @type RetrievalNotAllowedError */ (error).uri).to.equal(uri);
    });

    test("a symlink to a file outside the working directory is refused", async () => {
      const uri = pathToFileURL(join(inside, "link.schema.json")).href;
      await expect(v1().compile(uri)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a file in a symlinked directory that's outside the working directory is refused", async () => {
      const uri = pathToFileURL(join(inside, "linked-directory", "outside.schema.json")).href;
      await expect(v1().compile(uri)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a missing file in the working directory is missing, not refused", async () => {
      const uri = pathToFileURL(join(inside, "missing.schema.json")).href;
      const error = await v1().compile(uri)
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(RetrievalError);
      expect(/** @type Error */ (error).cause).toMatchObject({ code: "ENOENT" });
    });

    test("a reference to a file outside the working directory is refused", async () => {
      const uri = pathToFileURL(join(inside, "refers-outside.schema.json")).href;
      await expect(v1().compile(uri)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a schema in a symlinked directory resolves references from the target", async () => {
      // `linked/../other.schema.json` is the number schema, but
      // `deep/real/../other.schema.json` is the string schema
      await mkdir(join(inside, "deep", "real"), { recursive: true });
      await writeFile(join(inside, "deep", "real", "refers-up.schema.json"), JSON.stringify({ $schema: v1DialectUri, $ref: "../other.schema.json" }));
      await writeFile(join(inside, "deep", "other.schema.json"), schema);
      await writeFile(join(inside, "other.schema.json"), JSON.stringify({ $schema: v1DialectUri, type: "number" }));
      await symlink(join(inside, "deep", "real"), join(inside, "linked"));

      const validator = await v1().compile(pathToFileURL(join(inside, "linked", "refers-up.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("http(s): is refused", async () => {
      await expect(v1().compile("https://example.com/schema")).rejects.toThrow(RetrievalNotAllowedError);
      await expect(v1().compile("http://localhost/schema")).rejects.toThrow(RetrievalNotAllowedError);
    });
  });

  describe("a custom predicate", () => {
    test("it replaces the default", async () => {
      const jsonSchema = v1({ allowRetrieval: (url) => url.protocol === "file:" });
      const validator = await jsonSchema.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("it gets a file's real path", async () => {
      /** @type URL[] */
      const urls = [];
      const jsonSchema = v1({
        allowRetrieval: (url) => {
          urls.push(url);
          return true;
        }
      });
      await jsonSchema.compile(pathToFileURL(join(inside, "link.schema.json")).href);

      const real = pathToFileURL(await realpath(join(outside, "outside.schema.json"))).href;
      expect(urls.map((url) => url.href)).to.include(real);
      expect(urls.map((url) => url.href)).not.to.include(pathToFileURL(join(inside, "link.schema.json")).href);
    });

    test("it can be async", async () => {
      const jsonSchema = v1({ allowRetrieval: async () => false });
      await expect(jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("registries aren't checked", async () => {
      const jsonSchema = v1({ allowRetrieval: () => false });
      const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/schema" });
      const validator = await jsonSchema.compile("https://example.com/schema", { registries: [registry] });
      expect(validator.validate("foo")).to.equal(true);
    });

    test("a response from a refused URL isn't used", async () => {
      const jsonSchema = v1({ allowRetrieval: (url) => url.protocol === "test:" });
      jsonSchema.addUriSchemePlugin({
        schemes: ["test"],
        retrieve: async () => {
          const response = new Response(schema, { headers: { "Content-Type": "application/schema+json" } });
          Object.defineProperty(response, "url", { value: "https://internal.example.com/schema" });
          return response;
        }
      });

      const error = await jsonSchema.compile("test:schema")
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(RetrievalNotAllowedError);
      expect(/** @type RetrievalNotAllowedError */ (error).uri).to.equal("https://internal.example.com/schema");
      expect(/** @type Error */ (error).message).to.contain("'test:schema' led to 'https://internal.example.com/schema'");
    });
  });

  describe("a session's predicate", () => {
    test("it's used instead of the config's", async () => {
      const jsonSchema = v1({ allowRetrieval: () => false });
      const session = jsonSchema.session({ allowRetrieval: (url) => url.protocol === "file:" });
      const validator = await session.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("it can refuse what the config allows", async () => {
      const jsonSchema = v1({ allowRetrieval: () => true });
      const session = jsonSchema.session({ allowRetrieval: () => false });
      await expect(session.compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("other sessions use the config's", async () => {
      const jsonSchema = v1({ allowRetrieval: () => false });
      jsonSchema.session({ allowRetrieval: () => true });
      await expect(jsonSchema.session().compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("references use it", async () => {
      const session = v1({ allowRetrieval: () => false }).session({ allowRetrieval: (url) => url.protocol === "file:" });
      const validator = await session.compile(pathToFileURL(join(inside, "refers-outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("it checks where a response came from", async () => {
      const jsonSchema = v1({ allowRetrieval: () => true });
      jsonSchema.addUriSchemePlugin({
        schemes: ["test"],
        retrieve: async () => {
          const response = new Response(schema, { headers: { "Content-Type": "application/schema+json" } });
          Object.defineProperty(response, "url", { value: "https://internal.example.com/schema" });
          return response;
        }
      });

      const session = jsonSchema.session({ allowRetrieval: (url) => url.protocol === "test:" });
      await expect(session.compile("test:schema")).rejects.toThrow("'test:schema' led to 'https://internal.example.com/schema'");
    });
  });

  describe("the default in a browser", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    test("an http(s): URL with the page's origin is allowed", () => {
      vi.stubGlobal("location", { origin: "https://example.com" });
      expect(BrowserRetrieval.defaultAllowRetrieval(new URL("https://example.com/schema"))).to.equal(true);
    });

    test("another origin is refused", () => {
      vi.stubGlobal("location", { origin: "https://example.com" });
      expect(BrowserRetrieval.defaultAllowRetrieval(new URL("https://other.example.com/schema"))).to.equal(false);
      expect(BrowserRetrieval.defaultAllowRetrieval(new URL("http://example.com/schema"))).to.equal(false);
    });

    test("file: is refused", () => {
      vi.stubGlobal("location", { origin: "null" });
      expect(BrowserRetrieval.defaultAllowRetrieval(new URL("file:///schema.schema.json"))).to.equal(false);
    });

    test("nothing is allowed without a page", () => {
      expect(BrowserRetrieval.defaultAllowRetrieval(new URL("https://example.com/schema"))).to.equal(false);
    });
  });
});

describe("the default's directory check", () => {
  test("a sibling directory whose name starts with the working directory's isn't in it", async () => {
    const sibling = `${await realpath(cwd())}-other`;
    expect(await defaultAllowRetrieval(pathToFileURL(join(sibling, "a.schema.json")))).to.equal(false);
  });

  test("a file whose name starts with '..' is in it", async () => {
    expect(await defaultAllowRetrieval(pathToFileURL(join(await realpath(cwd()), "..a.schema.json")))).to.equal(true);
  });

  test("the parent directory isn't in it", async () => {
    expect(await defaultAllowRetrieval(pathToFileURL(join(await realpath(cwd()), "..", "a.schema.json")))).to.equal(false);
  });
});
