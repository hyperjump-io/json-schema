import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { openApi30Dialect, openApi30DialectUri } from "../../dialects/openapi-3-0/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../../dialects/openapi-3-1/index.js";
import { openApi32Vocabulary, openApi32VocabularyUri } from "../../dialects/openapi-3-2/index.js";
import { openApiResolve } from "../../openapi/index.js";
import discriminatorWithoutComposition from "./discriminator-without-composition.js";

/**
 * The dialect of a test's Schema Objects without `jsonSchemaDialect`, by its
 * OpenAPI version, as `defaultDialects` would give it: 3.1's "OAS dialect
 * schema id", and the latest dated 3.2 dialect
 *
 * @type (json: string) => string | undefined
 */
const defaultDialectOf = (json) => versionDialects[/"openapi"\s*:\s*"(\d+\.\d+)/.exec(json)?.[1] ?? ""];

/** @type Record<string, string> */
const versionDialects = {
  3.1: "https://spec.openapis.org/oas/3.1/dialect/base",
  3.2: "https://spec.openapis.org/oas/3.2/dialect/2026-02-26"
};

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

describe("discriminator-without-composition", () => {
  test("a discriminator without oneOf, anyOf, or allOf that nothing builds on", async () => {
    const file = await lint(`{ "openapi": "3.0.4", "info": { "title": "Pets", "version": "1" }, "paths": {}, "components": { "schemas": { "Pet": { "type": "object", "discriminator": { "propertyName": "kind" } } } } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'discriminator' is only allowed with 'oneOf', 'anyOf', or 'allOf' next to it, or in a schema that an 'allOf' refers to"
    ]);
    expect(file.messages[0].ruleId).to.equal("discriminator-without-composition");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 137, offset: 136 },
      end: { line: 1, column: 180, offset: 179 }
    });
  });

  for (const name of ["oneOf", "anyOf", "allOf"]) {
    test(`with ${name} next to it`, async () => {
      const file = await lint(openApi("3.0.4", {
        Pet: { [name]: [{ $ref: "#/components/schemas/Cat" }], discriminator: { propertyName: "kind" } },
        Cat: { type: "object" }
      }));
      expect(file.messages).to.eql([]);
    });
  }

  test("a parent that an allOf refers to (3.0)", async () => {
    const file = await lint(openApi("3.0.4", {
      Pet: { type: "object", discriminator: { propertyName: "kind" } },
      Cat: { allOf: [{ $ref: "#/components/schemas/Pet" }, { type: "object" }] }
    }));
    expect(file.messages).to.eql([]);
  });

  test("a parent that an allOf refers to (3.1)", async () => {
    const file = await lint(openApi("3.1.1", {
      Pet: { type: "object", discriminator: { propertyName: "kind" } },
      Cat: { allOf: [{ $ref: "#/components/schemas/Pet", description: "A pet" }, { type: "object" }] }
    }));
    expect(file.messages).to.eql([]);
  });

  test("a schema that's referred to, but not from an allOf", async () => {
    const file = await lint(openApi("3.1.1", {
      Pet: { type: "object", discriminator: { propertyName: "kind" } },
      Owner: { properties: { pet: { $ref: "#/components/schemas/Pet" } } }
    }));
    expect(file.messages).to.have.length(1);
  });

  test("3.2", async () => {
    const file = await lint(openApi("3.2.0", {
      Pet: { type: "object", discriminator: { propertyName: "kind", defaultMapping: "Cat" } }
    }));
    expect(file.messages).to.have.length(1);
  });

  test("in a subschema", async () => {
    const file = await lint(openApi("3.0.4", {
      Owner: { properties: { pet: { type: "object", discriminator: { propertyName: "kind" } } } }
    }));
    expect(file.messages).to.have.length(1);
  });

  test("a schema in a file of its own isn't reported, because what builds on it can't be seen", async () => {
    const file = new VFile({ path: "/schemas/pet.json", value: `{ "type": "object", "discriminator": { "propertyName": "kind" } }` });
    const processor = unified()
      .use(rejsonParse)
      .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema), dialectUri: openApi30DialectUri })
      .use(discriminatorWithoutComposition);
    await processor.run(processor.parse(file), file);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/api/openapi.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(openApiResolve, { session: new Hyperjump(jsonSchema), dialectUri: defaultDialectOf(json) })
    .use(discriminatorWithoutComposition);
  await processor.run(processor.parse(file), file);
  return file;
};
