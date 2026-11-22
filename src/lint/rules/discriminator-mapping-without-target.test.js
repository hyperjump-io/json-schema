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
import discriminatorMappingWithoutTarget from "./discriminator-mapping-without-target.js";

/** The "OAS dialect schema id" of 3.1, and the latest dated 3.2 dialect */
const defaultDialects = {
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

describe("discriminator-mapping-without-target", () => {
  /** @type (version: string, discriminator: Json) => string */
  const withDiscriminator = (version, discriminator) => openApi(version, {
    Pet: { oneOf: [{ $ref: "#/components/schemas/Cat" }, { $ref: "#/components/schemas/Dog" }], discriminator },
    Cat: { type: "object" },
    Dog: { type: "object" }
  });

  test("a mapping value that isn't a schema name or a reference to a schema", async () => {
    const file = await lint(withDiscriminator("3.0.4", { propertyName: "kind", mapping: { cat: "Cat", bird: "Bird" } }));
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'mapping' for 'bird' is 'Bird', which isn't a schema name in 'components.schemas' or a URI reference to a schema. To refer to a schema by its URI, write './Bird'."
    ]);
    expect(file.messages[0].ruleId).to.equal("discriminator-mapping-without-target");
    expect(file.messages[0].source).to.equal("json-schema-lint");
  });

  test("schema names", async () => {
    const file = await lint(withDiscriminator("3.0.4", { propertyName: "kind", mapping: { cat: "Cat", dog: "Dog" } }));
    expect(file.messages).to.eql([]);
  });

  test("a URI reference to a schema in the document", async () => {
    const file = await lint(withDiscriminator("3.1.1", { propertyName: "kind", mapping: { dog: "#/components/schemas/Dog" } }));
    expect(file.messages).to.eql([]);
  });

  test("a URI reference to a location in the document that isn't a schema", async () => {
    const file = await lint(withDiscriminator("3.1.1", { propertyName: "kind", mapping: { dog: "#/components/schemas/Nope", info: "#/info" } }));
    expect(file.messages).to.have.length(2);
  });

  test("a URI reference to another document isn't checked", async () => {
    const file = await lint(withDiscriminator("3.1.1", { propertyName: "kind", mapping: { dog: "./dog.json", cat: "https://example.com/cat" } }));
    expect(file.messages).to.eql([]);
  });

  test("a value that isn't a URI reference", async () => {
    const file = await lint(withDiscriminator("3.1.1", { propertyName: "kind", mapping: { dog: "a dog" } }));
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'mapping' for 'dog' is 'a dog', which isn't a schema name in 'components.schemas' or a URI reference to a schema."
    ]);
  });

  test("a value that can be a name is one, even if it would find a schema as a URI reference", async () => {
    const file = await lint(withDiscriminator("3.1.1", { propertyName: "kind", mapping: { dog: "openapi.json" } }));
    expect(file.messages).to.have.length(1);
  });

  test("3.2's defaultMapping", async () => {
    const file = await lint(withDiscriminator("3.2.0", { propertyName: "kind", defaultMapping: "Bird" }));
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'defaultMapping' is 'Bird', which isn't a schema name in 'components.schemas' or a URI reference to a schema. To refer to a schema by its URI, write './Bird'."
    ]);
  });

  test("a schema in a file of its own isn't checked, because it has no schema names", async () => {
    const file = new VFile({ path: "/schemas/pet.json", value: `{ "oneOf": [], "discriminator": { "propertyName": "kind", "mapping": { "bird": "Bird" } } }` });
    const processor = unified()
      .use(rejsonParse)
      .use(jsonSchemaResolve, { session: new Hyperjump(jsonSchema), dialectUri: openApi30DialectUri })
      .use(discriminatorMappingWithoutTarget);
    await processor.run(processor.parse(file), file);
    expect(file.messages.filter((message) => message.ruleId === "discriminator-mapping-without-target")).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/api/openapi.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(openApiResolve, { session: new Hyperjump(jsonSchema), defaultDialects })
    .use(discriminatorMappingWithoutTarget);
  await processor.run(processor.parse(file), file);
  return file;
};
