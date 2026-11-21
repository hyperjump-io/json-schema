import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../dialects/openapi-3-1/index.js";
import openApi31 from "./openapi-3-1.js";

const $schema = "https://spec.openapis.org/oas/3.1/dialect/2024-11-10";
const metaSchema = JSON.parse(readFileSync(new URL("../dialects/openapi-3-1/meta-schemas/dialect-2024-11-10.json", import.meta.url), "utf8"));

describe("openapi-3-1 preset", () => {
  test("has recommended's rules", async () => {
    const file = await lint(`{ "$schema": "${$schema}", "type": "string", "minLength": 2, "maxLength": 1 }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["contradictory-limits", false]
    ]);
  });

  test("unknown-field is a warning", async () => {
    const file = await lint(`{ "$schema": "${$schema}", "xml": { "nme": "pet" } }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["unknown-field", false]
    ]);
  });

  test("wrapped-without-array is a warning", async () => {
    const file = await lint(`{ "$schema": "${$schema}", "type": "string", "xml": { "wrapped": true } }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["wrapped-without-array", false]
    ]);
  });

  test("deprecated-example is a warning", async () => {
    const file = await lint(`{ "$schema": "${$schema}", "example": "Misty" }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["deprecated-example", false]
    ]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const jsonSchema = jsonSchemaConfig({
    dialects: [draft202012Dialect],
    vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
    registry: new SchemaRegistry([{ schema: metaSchema }]),
    allowRetrieval: []
  });
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema) })
    .use(openApi31);
  await processor.run(processor.parse(file), file);
  return file;
};
