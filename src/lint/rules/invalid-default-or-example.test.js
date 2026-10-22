import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { JsonSchema } from "../../json-schema.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { addDraft04 } from "../../dialects/draft-04/index.js";
import { addDraft202012 } from "../../dialects/draft-2020-12/index.js";
import invalidDefaultOrExample from "./invalid-default-or-example.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";
const uri = "file:///schemas/a.schema.json";

/**
 * Lint with the schema in the session's registry, as the CLI has every
 * schema in the working directory
 *
 * @type (json: string) => Promise<VFile>
 */
const lint = async (json) => {
  const jsonSchema = new JsonSchema();
  addDraft04(jsonSchema);
  addDraft202012(jsonSchema);
  const session = jsonSchema.session({ registries: [new SchemaRegistry([{ schema: json, retrievalUri: uri }])] });

  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session, uri })
    .use(invalidDefaultOrExample);
  await processor.run(processor.parse(file), file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const invalidDefault = "The 'default' value isn't valid against the schema it's in";
const invalidExample = "This example isn't valid against the schema it's in";

describe("invalid-default-or-example", () => {
  test("an invalid default", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "default": "not-an-integer" }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([invalidDefault]);
    expect(file.messages[0].ruleId).to.equal("invalid-default-or-example");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const value = `"not-an-integer"`;
    const offset = json.indexOf(value);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + value.length + 1, offset: offset + value.length }
    });
  });

  test("a valid default", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "default": 1 }`)).to.eql([]);
  });

  test("each invalid example", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "examples": [42, "a", 1.5] }`)).to.eql([invalidExample, invalidExample]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{
      "$schema": "${draft2020}",
      "type": "object",
      "properties": { "flag": { "type": "boolean", "default": "maybe" } },
      "default": { "flag": "maybe" }
    }`)).to.eql([invalidDefault, invalidDefault]);
  });

  test("what the schema references counts", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$defs": { "a": { "minimum": 10 } }, "$ref": "#/$defs/a", "default": 5 }`)).to.eql([invalidDefault]);
  });

  test("a schema that can't be compiled isn't checked", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "$ref": "https://example.com/nope", "default": 5 }`)).to.eql([]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "default": { "type": "string" }, "examples": { "type": "string" } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "default": 1 }`)).to.eql([invalidDefault]);
  });

  test("draft-04 doesn't have examples", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "examples": [1] }`)).to.eql([]);
  });
});
