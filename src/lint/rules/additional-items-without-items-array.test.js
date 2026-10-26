import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import additionalItemsWithoutItemsArray from "./additional-items-without-items-array.js";

const draft07 = "http://json-schema.org/draft-07/schema#";

describe("additional-items-without-items-array", () => {
  test("items is a schema", async () => {
    const json = `{ "$schema": "${draft07}", "items": { "type": "number" }, "additionalItems": false }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'additionalItems' has no effect when 'items' is a schema, not an array of schemas"
    ]);
    expect(file.messages[0].ruleId).to.equal("additional-items-without-items-array");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"additionalItems"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 25, offset: offset + 24 }
    });
  });

  test("items is a boolean schema", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": true, "additionalItems": false }`))
      .to.eql(["'additionalItems' has no effect when 'items' is a schema, not an array of schemas"]);
  });

  test("without items", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "additionalItems": false }`))
      .to.eql(["'additionalItems' has no effect without 'items'"]);
  });

  test("items is an array of schemas", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": [{}], "additionalItems": false }`)).to.eql([]);
  });

  test("draft-04 and 2019-09", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "additionalItems": false }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "https://json-schema.org/draft/2019-09/schema", "additionalItems": false }`)).to.have.length(1);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "properties": { "foo": { "additionalItems": false } } }`)).to.have.length(1);
  });

  test("a property named additionalItems isn't a keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "properties": { "additionalItems": false } }`)).to.eql([]);
  });

  test("a dialect without additionalItems", async () => {
    expect(await reasons(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "items": {}, "additionalItems": false }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(additionalItemsWithoutItemsArray)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
