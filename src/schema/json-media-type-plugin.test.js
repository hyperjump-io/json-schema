import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
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

  const session = () => {
    const jsonSchema = new JsonSchema();
    addV1(jsonSchema);
    return jsonSchema.session();
  };

  test("a .json file whose $schema is a dialect is a schema", async () => {
    const uri = await jsonFile("person.json", { $schema: v1DialectUri, $defs: { name: { type: "string" } } });
    const document = await session().getDocument(uri);

    expect(document.type).to.equal("json-schema-document");
    expect(document.mediaType).to.equal("application/schema+json");
  });

  test("its fragments are a schema's", async () => {
    const uri = await jsonFile("anchored.json", { $schema: v1DialectUri, $defs: { name: { $anchor: "name", type: "string" } } });
    const validator = await session().compile(`${uri}#name`);

    expect(validator.validate(42)).to.equal(false);
  });

  test("a .json file without $schema is JSON", async () => {
    const uri = await jsonFile("plain.json", { type: "string" });
    expect((await session().getDocument(uri)).type).to.equal("json-document");
  });

  test("a .json file whose $schema is an instance's schema is JSON", async () => {
    const schemaUri = await jsonFile("instance-schema.json", { $schema: v1DialectUri, type: "object" });
    const uri = await jsonFile("instance.json", { $schema: schemaUri, name: "a" });
    expect((await session().getDocument(uri)).type).to.equal("json-document");
  });

  test("a .json file in a dialect a .json meta-schema defines is a schema", async () => {
    const metaUri = await jsonFile("meta.json", {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/core": true }
    });
    const jsonSchema = new JsonSchema();
    addV1(jsonSchema);
    addDraft202012(jsonSchema);
    const uri = await jsonFile("custom.json", { $schema: metaUri });

    expect((await jsonSchema.session().getDocument(uri)).type).to.equal("json-schema-document");
  });
});
