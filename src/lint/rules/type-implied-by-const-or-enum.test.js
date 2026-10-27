import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import typeImpliedByConstOrEnum from "./type-implied-by-const-or-enum.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

const enumMessage = "'type' has no effect, because it allows every value in 'enum'";
const constMessage = "'type' has no effect, because it allows the 'const' value";

describe("type-implied-by-const-or-enum", () => {
  test("type with enum", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "enum": [1, 2, 3] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([enumMessage]);
    expect(file.messages[0].ruleId).to.equal("type-implied-by-const-or-enum");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"type": "integer"`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("a type array", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["string", "null"], "enum": ["none", "some", null] }`)).to.eql([enumMessage]);
  });

  test("type with const", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "string", "const": "ready" }`)).to.eql([constMessage]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["number", "integer"], "const": 3.14 }`)).to.eql([constMessage]);
  });

  test("1.0 is an integer", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "const": 1.0 }`)).to.eql([constMessage]);
  });

  test("a value type doesn't allow", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "string", "enum": ["a", null] }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "const": 1.5 }`)).to.eql([]);
  });

  test("without const or enum", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "string" }`)).to.eql([]);
  });

  test("an empty enum", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "string", "enum": [] }`)).to.eql(["'type' has no effect, because it allows every value in 'enum'"]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "type": "boolean", "enum": [true, false] } }`)).to.eql([enumMessage]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "type": { "enum": [1] }, "enum": { "type": "string" } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "string", "enum": ["a"] }`)).to.eql([enumMessage]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(typeImpliedByConstOrEnum)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
