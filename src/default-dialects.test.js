import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { fetcher } from "@hyperjump/browser";
import { jsonSchemaConfig } from "./json-schema.js";
import { compile } from "./operations/compile.js";
import { validatorFor } from "./operations/validate-compiled.js";
import { draft07Dialect } from "./dialects/draft-07/index.js";
import { draft202012Dialect } from "./dialects/draft-2020-12/index.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { JsonSchemaConfigOptions } from "./json-schema.d.ts"
 */

const draft07 = "http://json-schema.org/draft-07/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

// `prefixItems` is a keyword in 2020-12 and an unknown keyword in draft-07,
// so the dialect a schema was read in is whether `[1]` is valid
const schema = { prefixItems: [{ type: "string" }] };

describe("defaultDialects", () => {
  /** A directory in the working directory, which the default allows */
  let directory = "";

  /** @type (name: string, document: Json) => Promise<string> */
  const write = async (name, document) => {
    const path = join(directory, name);
    await writeFile(path, JSON.stringify(document));
    return pathToFileURL(path).href;
  };

  /** @type (options?: Partial<JsonSchemaConfigOptions>) => ReturnType<typeof jsonSchemaConfig> */
  const configWith = (options = {}) => jsonSchemaConfig({ dialects: [draft07Dialect, draft202012Dialect], ...options });

  /** @type (config: ReturnType<typeof jsonSchemaConfig>, uri: string, options?: Parameters<typeof compile>[2]) => Promise<boolean> */
  const isPrefixItems = async (config, uri, options) => !validatorFor(await compile(config, uri, options))([1]);

  /** The directory's URL, as a key for everything in it */
  const folder = () => pathToFileURL(`${directory}/`).href;

  beforeAll(async () => {
    directory = await mkdtemp(join(cwd(), ".default-dialects-test-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  test("a .json without $schema under a key is a schema in its dialect", async () => {
    const uri = await write("plain.json", schema);
    expect(await isPrefixItems(configWith({ defaultDialects: { [folder()]: draft202012 } }), uri)).to.equal(true);
  });

  test("a .json without $schema and without a key is JSON", async () => {
    const uri = await write("plain.json", schema);
    await expect(compile(configWith(), uri)).rejects.toMatchObject({ cause: { code: "ERR_NOT_A_SCHEMA" } });
  });

  test("the longest key wins", async () => {
    const uri = await write("exact.json", schema);
    const config = configWith({ defaultDialects: { [folder()]: draft202012, [uri]: draft07 } });
    expect(await isPrefixItems(config, uri)).to.equal(false);
  });

  test("a relative key is resolved against the working directory", async () => {
    const uri = await write("relative.json", schema);
    expect(await isPrefixItems(configWith({ defaultDialects: { [`./${basename(directory)}/`]: draft202012 } }), uri)).to.equal(true);
  });

  test("its own $schema wins", async () => {
    const uri = await write("own.json", { $schema: `${draft07}#`, ...schema });
    expect(await isPrefixItems(configWith({ defaultDialects: { [folder()]: draft202012 } }), uri)).to.equal(false);
  });

  test("a $schema that isn't a dialect keeps a .json JSON, as an instance", async () => {
    const uri = await write("instance.json", { $schema: "./plain.json", name: "Misty" });
    await expect(compile(configWith({ defaultDialects: { [folder()]: draft202012 } }), uri)).rejects.toMatchObject({
      cause: { code: "ERR_NOT_A_SCHEMA" }
    });
  });

  test("a key whose value isn't a dialect leaves a .json JSON", async () => {
    const uri = await write("not-a-dialect.json", schema);
    await expect(compile(configWith({ defaultDialects: { [folder()]: "https://example.com/not-a-dialect" } }), uri)).rejects.toMatchObject({
      cause: { code: "ERR_NOT_A_SCHEMA" }
    });
  });

  test("a .schema.json without $schema gets the key's dialect", async () => {
    const uri = await write("named.schema.json", schema);
    expect(await isPrefixItems(configWith({ defaultDialects: { [folder()]: draft202012 } }), uri)).to.equal(true);
  });

  test("a reference to a .json without $schema under a key finds a schema", async () => {
    await write("item.json", { type: "string" });
    const uri = await write("list.schema.json", { $schema: draft202012, items: { $ref: "./item.json" } });
    const isList = validatorFor(await compile(configWith({ defaultDialects: { [`${folder()}item.json`]: draft202012 } }), uri));
    expect(isList(["Misty"])).to.equal(true);
    expect(isList([1])).to.equal(false);
  });

  test("a call's defaultDialects replaces the config's", async () => {
    const uri = await write("call.json", schema);
    const config = configWith({ defaultDialects: { [folder()]: draft07 } });
    expect(await isPrefixItems(config, uri, { defaultDialects: { [folder()]: draft202012 } })).to.equal(true);
  });

  test("a Content-Type's schema parameter wins", async () => {
    const config = configWith({
      defaultDialects: { "https://example.com/": draft202012 },
      stack: fetcher(() => new Response(JSON.stringify(schema), { headers: { "content-type": `application/schema+json; schema="${draft07}"` } })),
      allowRetrieval: ["https://example.com/"]
    });
    expect(await isPrefixItems(config, "https://example.com/schema")).to.equal(false);
  });
});
