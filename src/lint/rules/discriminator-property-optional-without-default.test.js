import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { openApi30Dialect } from "../../dialects/openapi-3-0/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../../dialects/openapi-3-1/index.js";
import { openApi32Vocabulary, openApi32VocabularyUri } from "../../dialects/openapi-3-2/index.js";
import { openApiResolve } from "../../openapi/index.js";
import discriminatorPropertyOptionalWithoutDefault from "./discriminator-property-optional-without-default.js";

/**
 * @import { Json } from "@hyperjump/browser"
 */

/** @type (path: string) => Json */
const readMetaSchema = (path) => JSON.parse(readFileSync(new URL(`../../dialects/${path}`, import.meta.url), "utf8"));

const jsonSchema = jsonSchemaConfig({
  dialects: [draft202012Dialect, openApi30Dialect],
  vocabularies: {
    [openApi31VocabularyUri]: openApi31Vocabulary,
    [openApi32VocabularyUri]: openApi32Vocabulary
  },
  registry: new SchemaRegistry([
    { schema: readMetaSchema("openapi-3-1/meta-schemas/dialect-base.json") },
    { schema: readMetaSchema("openapi-3-2/meta-schemas/dialect-2026-02-26.json") }
  ]),
  allowRetrieval: []
});

/** @type (version: string, schemas: Record<string, Json>) => string */
const openApi = (version, schemas) => JSON.stringify({
  openapi: version,
  info: { title: "Pets", version: "1" },
  paths: {},
  components: { schemas }
});

describe("discriminator-property-optional-without-default", () => {
  test("an optional discriminating property without defaultMapping", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }], discriminator: { propertyName: "petType" } },
      Cat: { type: "object" }
    }));
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'petType' is optional, so 'discriminator' needs 'defaultMapping' for objects without it"
    ]);
    expect(file.messages[0].ruleId).to.equal("discriminator-property-optional-without-default");
    expect(file.messages[0].source).to.equal("json-schema-lint");
  });

  test("with defaultMapping", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }], discriminator: { propertyName: "petType", defaultMapping: "Cat" } },
      Cat: { type: "object" }
    }));
    expect(file.messages).to.eql([]);
  });

  test("required next to it", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }], required: ["petType"], discriminator: { propertyName: "petType" } },
      Cat: { type: "object" }
    }));
    expect(file.messages).to.eql([]);
  });

  test("required by every alternative", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }, { $ref: "#/components/schemas/Dog" }], discriminator: { propertyName: "petType" } },
      Cat: { type: "object", required: ["petType"] },
      Dog: { type: "object", required: ["petType", "bark"] }
    }));
    expect(file.messages).to.eql([]);
  });

  test("required by only some alternatives", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }, { $ref: "#/components/schemas/Dog" }], discriminator: { propertyName: "petType" } },
      Cat: { type: "object", required: ["petType"] },
      Dog: { type: "object" }
    }));
    expect(file.messages).to.have.length(1);
  });

  test("3.1 has no defaultMapping", async () => {
    const file = await lint(openApi("3.1.1", {
      Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }], discriminator: { propertyName: "petType" } },
      Cat: { type: "object" }
    }));
    expect(file.messages).to.eql([]);
  });

  test("a schema in a file of its own", async () => {
    const file = new VFile({
      path: "/schemas/pet.json",
      value: `{ "$schema": "https://spec.openapis.org/oas/3.2/dialect/2026-02-26", "oneOf": [{ "type": "object" }], "discriminator": { "propertyName": "petType" } }`
    });
    const processor = unified()
      .use(rejsonParse)
      .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema) })
      .use(discriminatorPropertyOptionalWithoutDefault);
    await processor.run(processor.parse(file), file);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["discriminator-property-optional-without-default"]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/api/openapi.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(openApiResolve, { session: new Hyperjump(jsonSchema) })
    .use(discriminatorPropertyOptionalWithoutDefault);
  await processor.run(processor.parse(file), file);
  return file;
};
