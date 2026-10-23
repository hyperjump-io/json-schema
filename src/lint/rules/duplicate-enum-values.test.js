import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import duplicateEnumValues from "./duplicate-enum-values.js";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(duplicateEnumValues)
    .process(file);
  return file;
};

describe("duplicate-enum-values", () => {
  test("a duplicate string", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": ["a", "b", "a"] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["This value is already in 'enum'"]);
    expect(file.messages[0].ruleId).to.equal("duplicate-enum-values");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 63, offset: 62 },
      end: { line: 1, column: 66, offset: 65 }
    });
  });

  test("every duplicate is reported", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [1, 1, 1] }`);
    expect(file.messages).to.have.length(2);
  });

  test("numbers that are equal", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [1, 1.0] }`);
    expect(file.messages).to.have.length(1);
  });

  test("objects with properties in a different order", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [{ "a": 1, "b": [2] }, { "b": [2], "a": 1 }] }`);
    expect(file.messages).to.have.length(1);
  });

  test("values that aren't equal", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "enum": [1, "1", true, null, [1], [1, 1], { "a": 1 }, { "a": "1" }, {}, []]
    }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "enum": [null, null] } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named enum isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "enum": { "const": 1 } } }`);
    expect(file.messages).to.eql([]);
  });

  test("duplicates are a schema problem in draft-04, not lint", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema#", "enum": ["a", "a"] }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/draft-04/enum"]);
  });
});
