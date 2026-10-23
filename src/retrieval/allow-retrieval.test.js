import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, afterEach, expect, vi } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { JsonSchema, RetrievalNotAllowedError } from "../json-schema.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { AllowedUrls, resolveAllowRetrieval } from "./allowed-urls.js";
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
    outside = await mkdtemp(join(tmpdir(), "json-schema-"));
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

  describe("a list", () => {
    test("it replaces the default", async () => {
      const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(outside, "/")).href] });
      const validator = await jsonSchema.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
      await expect(jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("an entry that ends with '/' allows what's under it", async () => {
      const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(inside, "deep", "/")).href] });
      await mkdir(join(inside, "deep"), { recursive: true });
      await writeFile(join(inside, "deep", "under.schema.json"), schema);
      await mkdir(join(inside, "deeper"), { recursive: true });
      await writeFile(join(inside, "deeper", "sibling.schema.json"), schema);

      const validator = await jsonSchema.compile(pathToFileURL(join(inside, "deep", "under.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
      await expect(jsonSchema.compile(pathToFileURL(join(inside, "deeper", "sibling.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("any other entry allows only itself", async () => {
      const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(inside, "inside.schema.json")).href] });
      const validator = await jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
      await expect(jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json.bak")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("a relative entry is resolved against the working directory", async () => {
      const jsonSchema = v1({ allowRetrieval: [`./${relative(cwd(), inside)}/`] });
      const validator = await jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("a file: entry is compared by its real path", async () => {
      const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(inside, "linked-directory", "/")).href] });
      const validator = await jsonSchema.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("an entry's fragment is ignored", async () => {
      const jsonSchema = v1({ allowRetrieval: ["test:/schema#foo"] });
      jsonSchema.addUriSchemePlugin({
        schemes: ["test"],
        retrieve: async (uri) => {
          const response = new Response(schema, { headers: { "Content-Type": "application/schema+json" } });
          Object.defineProperty(response, "url", { value: uri });
          return response;
        }
      });

      const validator = await jsonSchema.compile("test:/schema");
      expect(validator.validate("foo")).to.equal(true);
    });

    test("an empty list allows nothing", async () => {
      const jsonSchema = v1({ allowRetrieval: [] });
      await expect(jsonSchema.compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("an entry that isn't a URL throws when it's configured", () => {
      expect(() => v1({ allowRetrieval: ["http://[example"] })).to.throw("'http://[example' in the 'allowRetrieval' config isn't a URL");
    });

    test("a predicate throws when it's configured", () => {
      /** @type unknown */
      const predicate = () => true;
      const allowRetrieval = /** @type string[] */ (predicate);
      expect(() => v1({ allowRetrieval })).to.throw("must be a list of URLs");
    });

    test("registries aren't checked", async () => {
      const jsonSchema = v1({ allowRetrieval: [] });
      const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/schema" });
      const validator = await jsonSchema.compile("https://example.com/schema", { registries: [registry] });
      expect(validator.validate("foo")).to.equal(true);
    });

    test("a response from a refused URL isn't used", async () => {
      const jsonSchema = v1({ allowRetrieval: ["test:/"] });
      jsonSchema.addUriSchemePlugin({
        schemes: ["test"],
        retrieve: async () => {
          const response = new Response(schema, { headers: { "Content-Type": "application/schema+json" } });
          Object.defineProperty(response, "url", { value: "https://internal.example.com/schema" });
          return response;
        }
      });

      const error = await jsonSchema.compile("test:/schema")
        .catch((/** @type unknown */ error) => error);
      expect(error).to.be.instanceOf(RetrievalNotAllowedError);
      expect(/** @type RetrievalNotAllowedError */ (error).uri).to.equal("https://internal.example.com/schema");
      expect(/** @type Error */ (error).message).to.contain("'test:/schema' led to 'https://internal.example.com/schema'");
    });
  });

  describe("a session's list", () => {
    test("it's used instead of the config's", async () => {
      const jsonSchema = v1({ allowRetrieval: [] });
      const session = jsonSchema.session({ allowRetrieval: [pathToFileURL(join(outside, "/")).href] });
      const validator = await session.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("it can refuse what the config allows", async () => {
      const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(inside, "/")).href] });
      const session = jsonSchema.session({ allowRetrieval: [] });
      await expect(session.compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("other sessions use the config's", async () => {
      const jsonSchema = v1({ allowRetrieval: [] });
      jsonSchema.session({ allowRetrieval: [pathToFileURL(join(inside, "/")).href] });
      await expect(jsonSchema.session().compile(pathToFileURL(join(inside, "inside.schema.json")).href)).rejects.toThrow(RetrievalNotAllowedError);
    });

    test("references use it", async () => {
      const session = v1({ allowRetrieval: [] }).session({ allowRetrieval: ["./", pathToFileURL(join(outside, "/")).href] });
      const validator = await session.compile(pathToFileURL(join(inside, "refers-outside.schema.json")).href);
      expect(validator.validate("foo")).to.equal(true);
    });

    test("it checks where a response came from", async () => {
      const jsonSchema = v1({ allowRetrieval: ["test:/", "https://internal.example.com/"] });
      jsonSchema.addUriSchemePlugin({
        schemes: ["test"],
        retrieve: async () => {
          const response = new Response(schema, { headers: { "Content-Type": "application/schema+json" } });
          Object.defineProperty(response, "url", { value: "https://internal.example.com/schema" });
          return response;
        }
      });

      const session = jsonSchema.session({ allowRetrieval: ["test:/"] });
      await expect(session.compile("test:/schema")).rejects.toThrow("'test:/schema' led to 'https://internal.example.com/schema'");
    });

    test("an entry that isn't a URL throws when the session is created", () => {
      expect(() => v1().session({ allowRetrieval: ["http://[example"] })).to.throw("isn't a URL");
    });
  });

  describe("in a browser", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
      vi.doUnmock("#retrieval");
      vi.resetModules();
    });

    /** @type () => Promise<typeof import("./allowed-urls.js")> */
    const browserAllowedUrls = async () => {
      vi.resetModules();
      vi.doMock("#retrieval", () => import("./allow-retrieval.browser.js"));
      return import("./allowed-urls.js");
    };

    test("the context URI is the page", () => {
      vi.stubGlobal("document", { location: { href: "https://example.com/app/index.html" } });
      expect(BrowserRetrieval.contextUri()).to.equal("https://example.com/app/index.html");
    });

    test("there's no context URI without a page", () => {
      expect(BrowserRetrieval.contextUri()).to.equal(undefined);
    });

    test("the default is the page's directory", async () => {
      vi.stubGlobal("document", { location: { href: "https://example.com/app/index.html" } });
      const { AllowedUrls } = await browserAllowedUrls();
      const allowed = new AllowedUrls();
      expect(await allowed.allows(new URL("https://example.com/app/schema"))).to.equal(true);
      expect(await allowed.allows(new URL("https://example.com/schema"))).to.equal(false);
      expect(await allowed.allows(new URL("https://other.example.com/app/schema"))).to.equal(false);
    });

    test("a relative entry without a page throws", async () => {
      const { resolveAllowRetrieval } = await browserAllowedUrls();
      expect(() => resolveAllowRetrieval(["./schemas/"])).to.throw("'./schemas/' in the 'allowRetrieval' config is relative");
    });

    test("an absolute entry without a page is fine", async () => {
      const { resolveAllowRetrieval } = await browserAllowedUrls();
      expect(resolveAllowRetrieval(["https://example.com/schemas/"])).to.eql(["https://example.com/schemas/"]);
    });

    test("the default without a page throws when it's checked, not before", async () => {
      const { AllowedUrls } = await browserAllowedUrls();
      const allowed = new AllowedUrls();
      await expect(allowed.allows(new URL("https://example.com/schema"))).rejects.toThrow("is relative");
    });
  });
});

describe("the working directory's entry", () => {
  /** @type AllowedUrls */
  let allowed;

  beforeAll(() => {
    allowed = new AllowedUrls(resolveAllowRetrieval(["./"]));
  });

  test("a sibling directory whose name starts with the working directory's isn't in it", async () => {
    const sibling = `${await realpath(cwd())}-other`;
    expect(await allowed.allows(pathToFileURL(join(sibling, "a.schema.json")))).to.equal(false);
  });

  test("a file whose name starts with '..' is in it", async () => {
    expect(await allowed.allows(pathToFileURL(join(await realpath(cwd()), "..a.schema.json")))).to.equal(true);
  });

  test("the parent directory isn't in it", async () => {
    expect(await allowed.allows(pathToFileURL(join(await realpath(cwd()), "..", "a.schema.json")))).to.equal(false);
  });
});
