import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { jsonSchemaConfig } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { compile } from "../operations/compile.js";
import { validatorFor } from "../operations/validate-compiled.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { openApi30Dialect } from "../dialects/openapi-3-0/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../dialects/openapi-3-1/index.js";
import { openApi32Vocabulary, openApi32VocabularyUri } from "../dialects/openapi-3-2/index.js";
import { unified } from "unified";
import { VFile } from "vfile";
import { fetcher, rejsonParse, Hyperjump } from "@hyperjump/browser";
import unknownField from "../lint/rules/unknown-field.js";
import { openApiMediaType, openApiResolve, openApiSpecMediaType } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser"
 */

/** @type (path: string) => Promise<Json> */
const readMetaSchema = async (path) => JSON.parse(await readFile(new URL(`../dialects/${path}`, import.meta.url), "utf8"));

/**
 * The dialect a test's Schema Objects get without `jsonSchemaDialect`, by its
 * OpenAPI version: 3.1's "OAS dialect schema id", and the latest dated 3.2
 * dialect
 *
 * @type (document: Json) => string | undefined
 */
const defaultDialectOf = (document) => {
  const version = typeof document === "object" && document !== null && "openapi" in document && typeof document.openapi === "string" ? document.openapi : "";
  return versionDialects[/^(\d+\.\d+)\./.exec(version)?.[1] ?? ""];
};

/** @type Record<string, string> */
const versionDialects = {
  3.1: "https://spec.openapis.org/oas/3.1/dialect/base",
  3.2: "https://spec.openapis.org/oas/3.2/dialect/2026-02-26"
};

describe("OpenAPI documents", () => {
  /** A directory in the working directory, which the default allows */
  let directory = "";

  /**
   * Each written document's dialect, by its URL, as a user would give it
   *
   * @type Record<string, string>
   */
  let defaultDialects = {};

  /** @type (name: string, document: Json) => Promise<string> */
  const write = async (name, document) => {
    const path = join(directory, name);
    await writeFile(path, JSON.stringify(document));
    const url = pathToFileURL(path).href;
    const dialectUri = defaultDialectOf(document);
    defaultDialects = { ...defaultDialects };
    if (dialectUri === undefined) {
      delete defaultDialects[url];
    } else {
      defaultDialects[url] = dialectUri;
    }
    return url;
  };

  const registry = new SchemaRegistry();
  const config = jsonSchemaConfig({
    dialects: [draft202012Dialect, openApi30Dialect],
    vocabularies: {
      [openApi31VocabularyUri]: openApi31Vocabulary,
      [openApi32VocabularyUri]: openApi32Vocabulary
    },
    mediaTypes: [openApiMediaType]
  });

  /** @type (uri: string) => Promise<(instance: Json) => boolean> */
  const validator = async (uri) => validatorFor(await compile(withMetaSchemas, uri, { defaultDialects }));
  let withMetaSchemas = config;

  beforeAll(async () => {
    directory = await mkdtemp(join(cwd(), ".openapi-test-"));
    withMetaSchemas = {
      ...config,
      registry: registry
        .with(await readMetaSchema("openapi-3-1/meta-schemas/dialect-base.json"))
        .with(await readMetaSchema("openapi-3-2/meta-schemas/dialect-2026-02-26.json"))
    };
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  describe("3.0", () => {
    /** @type string */
    let uri;

    beforeAll(async () => {
      uri = await write("openapi.json", {
        openapi: "3.0.4",
        info: { title: "Pets", version: "1" },
        paths: {
          "/pets": {
            get: {
              parameters: [
                { name: "limit", in: "query", schema: { type: "integer", minimum: 1 } },
                { $ref: "#/components/parameters/Offset" }
              ],
              responses: {
                200: {
                  description: "Pets",
                  content: { "application/json": { schema: { type: "array", items: { $ref: "#/components/schemas/Pet" } } } }
                }
              }
            }
          }
        },
        components: {
          schemas: {
            Pet: { type: "object", properties: { name: { type: "string" } }, required: ["name"] },
            Cat: { allOf: [{ $ref: "#/components/schemas/Pet" }, { type: "object", properties: { lives: { type: "integer" } } }] },
            Name: { type: "string", nullable: true }
          },
          parameters: {
            Offset: { name: "offset", in: "query", schema: { type: "integer", minimum: 0 } }
          }
        }
      });
    });

    test("a Schema Object in components compiles", async () => {
      const isPet = await validator(`${uri}#/components/schemas/Pet`);
      expect(isPet({ name: "Misty" })).to.equal(true);
      expect(isPet({})).to.equal(false);
    });

    test("with 3.0's dialect", async () => {
      const isName = await validator(`${uri}#/components/schemas/Name`);
      expect(isName(null)).to.equal(true);
      expect(isName(1)).to.equal(false);
    });

    test("a reference to another Schema Object", async () => {
      const isCat = await validator(`${uri}#/components/schemas/Cat`);
      expect(isCat({ name: "Misty", lives: 9 })).to.equal(true);
      expect(isCat({ lives: 9 })).to.equal(false);
    });

    test("a Schema Object in an operation", async () => {
      const isPets = await validator(`${uri}#/paths/~1pets/get/responses/200/content/application~1json/schema`);
      expect(isPets([{ name: "Misty" }])).to.equal(true);
      expect(isPets([{}])).to.equal(false);
    });

    test("a parameter's Schema Object", async () => {
      const isLimit = await validator(`${uri}#/paths/~1pets/get/parameters/0/schema`);
      expect(isLimit(1)).to.equal(true);
      expect(isLimit(0)).to.equal(false);
    });

    test("a Schema Object in a component a Reference Object refers to", async () => {
      const isOffset = await validator(`${uri}#/components/parameters/Offset/schema`);
      expect(isOffset(0)).to.equal(true);
      expect(isOffset(-1)).to.equal(false);
    });

    test("what isn't a Schema Object isn't a schema", async () => {
      await expect(compile(withMetaSchemas, `${uri}#/info`)).rejects.toMatchObject({ cause: { code: "ERR_NOT_A_SCHEMA" } });
    });
  });

  describe("3.1", () => {
    test("Schema Objects default to the dialect defaultDialects gives the document", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.1.1",
        info: { title: "Pets", version: "1" },
        components: { schemas: { Name: { type: ["string", "null"], minLength: 1 } } }
      });

      const isName = await validator(`${openapi}#/components/schemas/Name`);
      expect(isName(null)).to.equal(true);
      expect(isName("")).to.equal(false);
    });

    test("jsonSchemaDialect", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.1.1",
        info: { title: "Pets", version: "1" },
        jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
        components: { schemas: { Name: { type: "string", discriminator: "not an object" } } }
      });

      // In plain 2020-12, `discriminator` is an unknown keyword, so its value isn't checked
      const isName = await validator(`${openapi}#/components/schemas/Name`);
      expect(isName("Misty")).to.equal(true);
    });

    test("webhooks", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.1.1",
        info: { title: "Pets", version: "1" },
        webhooks: {
          newPet: {
            post: { requestBody: { content: { "application/json": { schema: { type: "object", required: ["name"] } } } }, responses: {} }
          }
        }
      });

      const isNewPet = await validator(`${openapi}#/webhooks/newPet/post/requestBody/content/application~1json/schema`);
      expect(isNewPet({ name: "Misty" })).to.equal(true);
      expect(isNewPet({})).to.equal(false);
    });

    test("a Schema Object with $id is found by it", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.1.1",
        info: { title: "Pets", version: "1" },
        components: {
          schemas: {
            Name: { $id: "https://example.com/name", type: "string" },
            Pet: { type: "object", properties: { name: { $ref: "https://example.com/name" } } }
          }
        }
      });

      const isPet = await validator(`${openapi}#/components/schemas/Pet`);
      expect(isPet({ name: "Misty" })).to.equal(true);
      expect(isPet({ name: 1 })).to.equal(false);
    });

    test("$schema that isn't next to $id is ignored", async () => {
      // `misplaced-dialect` reports it
      const openapi = await write("openapi.json", {
        openapi: "3.1.1",
        info: { title: "Pets", version: "1" },
        components: { schemas: { Name: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string" } } }
      });

      const isName = await validator(`${openapi}#/components/schemas/Name`);
      expect(isName("Misty")).to.equal(true);
      expect(isName(1)).to.equal(false);
    });
  });

  describe("3.2", () => {
    test("Schema Objects default to 3.2's dialect from defaultDialects", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.2.0",
        info: { title: "Pets", version: "1" },
        components: { schemas: { Pet: { type: "object", xml: { nodeType: "element" } } } }
      });

      const isPet = await validator(`${openapi}#/components/schemas/Pet`);
      expect(isPet({})).to.equal(true);
    });

    test("$self is the document's URI", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.2.0",
        $self: "https://example.com/api/openapi.json",
        info: { title: "Pets", version: "1" },
        components: {
          schemas: {
            Pet: { type: "object", properties: { name: { $ref: "https://example.com/api/openapi.json#/components/schemas/Name" } } },
            Name: { type: "string" }
          }
        }
      });

      const isPet = await validator(`${openapi}#/components/schemas/Pet`);
      expect(isPet({ name: "Misty" })).to.equal(true);
      expect(isPet({ name: 1 })).to.equal(false);
    });
  });

  describe("a .json file with another name", () => {
    /** @type string */
    let uri;

    beforeAll(async () => {
      uri = await write("petstore.json", {
        openapi: "3.0.4",
        info: { title: "Pets", version: "1" },
        paths: {},
        components: { schemas: { Pet: { type: "object", required: ["name"] } } }
      });
    });

    test("is an OpenAPI document by its openapi field", async () => {
      const isPet = await validator(`${uri}#/components/schemas/Pet`);
      expect(isPet({ name: "Misty" })).to.equal(true);
      expect(isPet({})).to.equal(false);
    });

    test("is JSON without the OpenAPI plugin", async () => {
      const withoutPlugin = jsonSchemaConfig({ dialects: [openApi30Dialect] });
      await expect(compile(withoutPlugin, `${uri}#/components/schemas/Pet`)).rejects.toMatchObject({ cause: { code: "ERR_NOT_A_SCHEMA" } });
    });

    test("is a schema if $schema is a dialect", async () => {
      const schema = await write("openapi-keyword.json", {
        $schema: "https://json-schema.org/draft/2020-12/schema",
        openapi: "not a version",
        type: "string"
      });
      const isString = await validator(schema);
      expect(isString("Misty")).to.equal(true);
      expect(isString(1)).to.equal(false);
    });
  });

  test("lint rules see the Schema Objects", async () => {
    const file = new VFile({
      path: join(directory, "lint.json"),
      value: JSON.stringify({
        openapi: "3.0.4",
        info: { title: "Pets", version: "1", xml: { nme: "not a Schema Object" } },
        paths: {},
        components: { schemas: { Pet: { type: "object", xml: { nme: "pet" } } } }
      })
    });
    const processor = unified()
      .use(rejsonParse)
      .use(openApiResolve, { session: new Hyperjump(withMetaSchemas) })
      .use(unknownField);
    await processor.run(processor.parse(file), file);

    expect(file.messages.map((message) => message.reason)).to.eql([
      "'nme' isn't a field of the XML Object, so tools ignore it."
    ]);
  });

  describe("OpenAPI's published schemas", () => {
    /** @type (body: string) => import("../json-schema.d.ts").JsonSchemaConfig */
    const servedAsOctetStream = (body) => jsonSchemaConfig({
      dialects: [draft202012Dialect],
      vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
      mediaTypes: [openApiMediaType, openApiSpecMediaType],
      stack: fetcher(() => new Response(body, { headers: { "content-type": "application/octet-stream" } })),
      allowRetrieval: ["https://spec.openapis.org/oas/", "https://example.com/"]
    });

    test("a dialect's meta-schema is retrieved from spec.openapis.org", async () => {
      const metaSchema = await readFile(new URL("../dialects/openapi-3-1/meta-schemas/dialect-base.json", import.meta.url), "utf8");
      const compiled = await compile(servedAsOctetStream(metaSchema), {
        $schema: "https://spec.openapis.org/oas/3.1/dialect/base",
        type: "string"
      });
      expect(validatorFor(compiled)("Misty")).to.equal(true);
      expect(validatorFor(compiled)(1)).to.equal(false);
    });

    test("application/octet-stream from anywhere else is refused", async () => {
      await expect(compile(servedAsOctetStream(`{ "type": "string" }`), "https://example.com/schema")).rejects.toMatchObject({
        cause: { code: "ERR_UNSUPPORTED_MEDIA_TYPE" }
      });
    });
  });

  describe("defaultDialects", () => {
    const base = "https://spec.openapis.org/oas/3.1/dialect/base";
    const doc = {
      openapi: "3.1.1",
      info: { title: "Pets", version: "1" },
      components: { schemas: { Name: { type: "string" }, Age: { type: "integer" } } }
    };

    test("3.1 and 3.2 have none, which is reported once, at openapi", async () => {
      const openapi = await write("openapi.json", doc);
      await expect(compile(withMetaSchemas, `${openapi}#/components/schemas/Name`)).rejects.toMatchObject({
        messages: [{ ruleId: "missing-dialect", place: { start: { column: 12 } } }]
      });
    });

    test("a document without Schema Objects doesn't need one", async () => {
      const openapi = await write("openapi.json", { openapi: "3.1.1", info: { title: "Pets", version: "1" }, paths: {} });
      await expect(compile(withMetaSchemas, `${openapi}#/info`)).rejects.toMatchObject({ cause: { code: "ERR_NOT_A_SCHEMA" } });
    });

    test("jsonSchemaDialect doesn't need one", async () => {
      const openapi = await write("openapi.json", { ...doc, jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema" });
      const isName = validatorFor(await compile(withMetaSchemas, `${openapi}#/components/schemas/Name`));
      expect(isName("Misty")).to.equal(true);
    });

    test("jsonSchemaDialect wins over a key", async () => {
      const openapi = await write("openapi.json", {
        ...doc,
        jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
        components: { schemas: { Name: { type: "string", discriminator: "not an object" } } }
      });

      // In plain 2020-12, `discriminator` is an unknown keyword, so its value isn't checked
      const isName = validatorFor(await compile(withMetaSchemas, `${openapi}#/components/schemas/Name`, { defaultDialects: { [openapi]: base } }));
      expect(isName("Misty")).to.equal(true);
    });

    test("a key for a folder gives its documents a dialect", async () => {
      const openapi = await write("openapi.json", doc);
      const isName = validatorFor(await compile(withMetaSchemas, `${openapi}#/components/schemas/Name`, { defaultDialects: { [pathToFileURL(`${directory}/`).href]: base } }));
      expect(isName("Misty")).to.equal(true);
    });

    test("a dialect that isn't found is reported once, where it was chosen", async () => {
      const openapi = await write("openapi.json", doc);
      const withoutMetaSchemas = { ...config, registry: new SchemaRegistry() };
      await expect(compile(withoutMetaSchemas, `${openapi}#/components/schemas/Name`, { defaultDialects: { [openapi]: base } })).rejects.toMatchObject({
        messages: [{ ruleId: "unknown-dialect", place: { start: { column: 12 } } }]
      });
    });

    test("3.0's can be replaced", async () => {
      const openapi = await write("openapi.json", {
        openapi: "3.0.4",
        info: { title: "Pets", version: "1" },
        components: { schemas: { Name: { type: ["string", "null"] } } }
      });

      const isName = validatorFor(await compile(withMetaSchemas, `${openapi}#/components/schemas/Name`, { defaultDialects: { [openapi]: "https://json-schema.org/draft/2020-12/schema" } }));
      expect(isName(null)).to.equal(true);
    });
  });

  test("a version this doesn't read", async () => {
    const openapi = await write("openapi.json", { openapi: "2.0", info: { title: "Pets", version: "1" } });
    await expect(compile(withMetaSchemas, `${openapi}#/components/schemas/Pet`)).rejects.toMatchObject({
      messages: [{ ruleId: "unknown-openapi-version" }]
    });
  });
});
