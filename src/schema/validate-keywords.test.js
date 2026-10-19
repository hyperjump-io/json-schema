import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeEach, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "./resolve.js";
import { jsonSchemaValidateKeywords } from "./validate-keywords.js";
import { v1DialectUri } from "../dialects/v1/index.js";

/**
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { ValidationError } from "../output/validation-error.d.ts"
 */

const baseUri = "https://example.com/schema";

/** @type (jsonSchema: JsonSchema, json: string) => Promise<VFile> */
const validateKeywords = async (jsonSchema, json) => {
  const file = new VFile(json);
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: jsonSchema.session(), uri: baseUri })
    .use(jsonSchemaValidateKeywords, { jsonSchema });
  await processor.run(processor.parse(file), file);

  return file;
};

describe("jsonSchemaValidateKeywords", () => {
  /** @type JsonSchema */
  let jsonSchema;

  beforeEach(() => {
    jsonSchema = new JsonSchema();
  });

  test("valid keyword values", async () => {
    const file = await validateKeywords(jsonSchema, `{
      "$schema": "${v1DialectUri}",
      "type": "object",
      "properties": { "foo": { "minLength": 1 } }
    }`);

    expect(file.messages).to.eql([]);
  });

  test("one message for each invalid keyword, on its value", async () => {
    const json = `{
  "$schema": "${v1DialectUri}",
  "type": "nope",
  "properties": { "foo": { "minLength": -1 } }
}`;
    const file = await validateKeywords(jsonSchema, json);

    expect(file.messages.map(({ reason, ruleId, place }) => {
      const { start, end } = /** @type any */ (place);
      return { reason, ruleId, line: start.line, value: json.slice(start.offset, end.offset) };
    })).to.eql([
      { reason: "The value of 'type' isn't valid", ruleId: "https://json-schema.org/keyword/type", line: 3, value: `"nope"` },
      { reason: "The value of 'minLength' isn't valid", ruleId: "https://json-schema.org/keyword/minLength", line: 4, value: "-1" }
    ]);
  });

  test("the keyword schema's errors are the cause", async () => {
    const file = await validateKeywords(jsonSchema, `{ "$schema": "${v1DialectUri}", "required": ["a", 1] }`);

    const cause = /** @type AggregateError */ (file.messages[0].cause);
    expect(cause).to.be.instanceOf(AggregateError);
    expect(cause.errors.map((/** @type ValidationError */ error) => [error.ruleId, error.instanceLocation])).to.eql([
      ["https://json-schema.org/keyword/type", "/1"]
    ]);
  });

  test("a keyword schema that refers to itself", async () => {
    const file = await validateKeywords(jsonSchema, `{
      "$schema": "${v1DialectUri}",
      "x-items": [{ "const": 1 }, [{ "const": 2 }, "nope"]],
      "itemPattern": [{ "const": 1 }, [{ "const": 2 }, "nope"]]
    }`);

    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/itemPattern"]);
  });

  test("a custom keyword's schema", async () => {
    jsonSchema.addKeyword({
      uri: "https://example.com/keyword/even",
      shape: "data",
      schema: { $schema: v1DialectUri, type: "boolean" }
    });
    jsonSchema.extendDialect(v1DialectUri, { keywords: { even: "https://example.com/keyword/even" } });

    const file = await validateKeywords(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": "yes" }`);

    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://example.com/keyword/even"]);
  });

  test("a replaced keyword's schema is used", async () => {
    const keyword = { uri: "https://example.com/keyword/even", shape: /** @type const */ ("data") };
    jsonSchema.addKeyword({ ...keyword, schema: { $schema: v1DialectUri, type: "boolean" } });
    jsonSchema.extendDialect(v1DialectUri, { keywords: { even: keyword.uri } });
    await validateKeywords(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": true }`);

    jsonSchema.addKeyword({ ...keyword, schema: { $schema: v1DialectUri, type: "string" } });
    const file = await validateKeywords(jsonSchema, `{ "$schema": "${v1DialectUri}", "even": true }`);

    expect(file.messages.map((message) => message.ruleId)).to.eql([keyword.uri]);
  });
});

describe("validating schemas", () => {
  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (json: string) => Promise<string> */
  const schemaFile = async (json) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, json);
    return pathToFileURL(path).toString();
  };

  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const jsonSchemaWith = (config) => new JsonSchema(config);

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("a schema with an invalid keyword value can't be compiled", async () => {
    const uri = await schemaFile(`{ "$schema": "${v1DialectUri}", "minLength": -1 }`);

    await expect(jsonSchemaWith().compile(uri)).rejects.toSatisfy((/** @type Error */ error) => {
      return /** @type VFileMessage */ (error.cause).ruleId === "https://json-schema.org/keyword/minLength";
    });
  });

  test("validateSchemas: false", async () => {
    const uri = await schemaFile(`{ "$schema": "${v1DialectUri}", "minLength": -1 }`);

    const validator = await jsonSchemaWith({ validateSchemas: false }).compile(uri);
    expect(validator.validate("")).to.equal(true);
  });
});
