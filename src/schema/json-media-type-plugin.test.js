import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { configureJsonSchema } from "../json-schema.js";
import { JsonSchemaHyperjump } from "../session.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { compile } from "../operations/compile.js";
import { validatorFor } from "../operations/validate-compiled.js";
import { getDocument } from "../session.js";
import { fetcher, nodeTransport } from "@hyperjump/browser";

/**
 * @import { Json } from "@hyperjump/browser"
 */

describe("JsonOrSchemaMediaTypePlugin", () => {
  /** @type string */
  let directory;

  /** @type (name: string, json: Json) => Promise<string> */
  const jsonFile = async (name, json) => {
    const path = join(directory, name);
    await writeFile(path, JSON.stringify(json));
    return pathToFileURL(path).href;
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(cwd(), ".json-media-type-plugin-test-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  const jsonSchema = () => configureJsonSchema({ dialects: [v1Dialect] });
  const session = () => new JsonSchemaHyperjump(jsonSchema());

  test("a .json file whose $schema is a dialect is a schema", async () => {
    const uri = await jsonFile("person.json", { $schema: v1DialectUri, $defs: { name: { type: "string" } } });
    const document = await getDocument(session(), uri);

    expect(document.type).to.equal("json-schema-document");
  });

  test("its fragments are a schema's", async () => {
    const uri = await jsonFile("anchored.json", { $schema: v1DialectUri, $defs: { name: { $anchor: "name", type: "string" } } });
    const compiled = await compile(jsonSchema(), `${uri}#name`);

    expect(validatorFor(compiled)(42)).to.equal(false);
  });

  test("a .json file without $schema is JSON", async () => {
    const uri = await jsonFile("plain.json", { type: "string" });
    expect((await getDocument(session(), uri)).type).to.equal("json-document");
  });

  test("a .json file whose $schema is a file is JSON", async () => {
    const uri = await jsonFile("relative-instance.json", { $schema: "./instance-schema.json", name: "a" });
    expect((await getDocument(session(), uri)).type).to.equal("json-document");
  });

  test("a .json file whose $schema is an instance's schema is JSON", async () => {
    const schemaUri = await jsonFile("instance-schema.json", { $schema: v1DialectUri, type: "object" });
    const uri = await jsonFile("instance.json", { $schema: schemaUri, name: "a" });
    expect((await getDocument(session(), uri)).type).to.equal("json-document");
  });

  test("a .json file in a dialect an application/json meta-schema defines is a schema", async () => {
    const metaSchema = JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/core": true }
    });
    const jsonSchema = configureJsonSchema({
      allowRetrieval: ["./", "test:/"],
      dialects: [v1Dialect, draft202012Dialect],
      stack: nodeTransport({
        schemes: { "test:": fetcher(() => new Response(metaSchema, { headers: { "Content-Type": "application/json" } })) }
      })
    });
    const uri = await jsonFile("custom.json", { $schema: "test:/meta" });

    expect((await getDocument(new JsonSchemaHyperjump(jsonSchema), uri)).type).to.equal("json-schema-document");
  });
});
