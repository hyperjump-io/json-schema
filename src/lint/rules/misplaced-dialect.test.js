import { readFileSync } from "node:fs";
import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../../json-schema.js";
import { draft07Dialect } from "../../dialects/draft-07/index.js";
import { draft202012Dialect } from "../../dialects/draft-2020-12/index.js";
import { openApi31Vocabulary, openApi31VocabularyUri } from "../../dialects/openapi-3-1/index.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { openApiResolve } from "../../openapi/index.js";
import { linter } from "../test-linter.js";
import misplacedDialect from "./misplaced-dialect.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("misplaced-dialect", () => {
  test("$schema in a subschema", async () => {
    const json = `{ "$schema": "${draft202012}", "properties": { "foo": { "$schema": "${draft07}", "type": "string" } } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'$schema' is only allowed at the root of a schema resource. It's ignored."]);
    expect(file.messages[0].ruleId).to.equal("misplaced-dialect");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.lastIndexOf(`"$schema"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 1 + `"$schema": "${draft07}"`.length, offset: offset + `"$schema": "${draft07}"`.length }
    });
  });

  test("$schema naming the same dialect in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "items": { "$schema": "${draft202012}" } }`)).to.have.length(1);
  });

  test("draft-04 through draft-07 only allow it at the document's root", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "definitions": { "a": { "$schema": "${draft07}" } } }`)).to.eql([
      "'$schema' is only allowed at the root of the document in draft-07. It's ignored."
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "properties": { "a": { "$schema": "${draft04}" } } }`)).to.eql([
      "'$schema' is only allowed at the root of the document in draft-04. It's ignored."
    ]);
  });

  test("draft-07 at the root of an embedded resource, which this implementation uses", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "definitions": { "a": { "$id": "https://example.com/a", "$schema": "${draft202012}" } }
    }`)).to.eql([
      "'$schema' is only allowed at the root of the document in draft-07. Other implementations might ignore it."
    ]);
  });

  test("draft-07 next to $ref, where it decides what $ref means", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": { "$schema": "${draft07}", "$ref": "#" } }`)).to.eql([
      "'$schema' is only allowed at the root of the document in draft-07. Other implementations might ignore it."
    ]);
  });

  test("the dialect of the schema it's in decides, not the one it names", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$defs": { "a": { "$id": "https://example.com/a", "$schema": "${draft07}" } }
    }`)).to.eql([]);
  });

  test("at the root", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "type": "string" }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft07}", "type": "string" }`)).to.eql([]);
  });

  test("at the root of an embedded resource in 2020-12", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$defs": { "a": { "$id": "https://example.com/a", "$schema": "${draft202012}" } }
    }`)).to.eql([]);
  });

  test("a root $ref", async () => {
    expect(await reasons(`{
      "$schema": "${draft07}",
      "$ref": "#/definitions/a",
      "definitions": { "a": { "properties": { "b": { "$schema": "${draft07}" } } } }
    }`)).to.eql([
      "'$schema' is only allowed at the root of the document in draft-07. It's ignored."
    ]);
  });

  test("a Schema Object in an OpenAPI document", async () => {
    const schemas = {
      Ignored: { $schema: draft202012, type: "string" },
      Resource: { $id: "https://example.com/name", $schema: draft07, type: "string" }
    };
    const file = await lintOpenApi(JSON.stringify({ openapi: "3.1.1", info: { title: "Pets", version: "1" }, paths: {}, components: { schemas } }));
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'$schema' is only allowed at the root of a schema resource. It's ignored."
    ]);
  });

  test("a property named $schema isn't a keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "$schema": { "type": "string" } } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(misplacedDialect)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/** @type (json: string) => Promise<VFile> */
const lintOpenApi = async (json) => {
  const metaSchema = JSON.parse(readFileSync(new URL("../../dialects/openapi-3-1/meta-schemas/dialect-base.json", import.meta.url), "utf8"));
  const jsonSchema = jsonSchemaConfig({
    dialects: [draft202012Dialect, draft07Dialect],
    vocabularies: { [openApi31VocabularyUri]: openApi31Vocabulary },
    registry: new SchemaRegistry([{ schema: metaSchema }]),
    allowRetrieval: []
  });
  const file = new VFile({ path: "/api/openapi.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(openApiResolve, { session: new Hyperjump(jsonSchema) })
    .use(misplacedDialect);
  await processor.run(processor.parse(file), file);
  return file;
};
