import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import emptyEnum from "./empty-enum.js";

describe("empty-enum", () => {
  test("an empty enum", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'enum' is empty, so nothing is valid against it"]);
    expect(file.messages[0].ruleId).to.equal("empty-enum");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 44, offset: 43 },
      end: { line: 1, column: 54, offset: 53 }
    });
  });

  test("an enum with values", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "enum": [null] }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "enum": [] } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named enum isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "enum": {} } }`);
    expect(file.messages).to.eql([]);
  });

  test("an empty enum is a schema problem in draft-04, not lint", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema#", "enum": [] }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/draft-04/enum"]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(emptyEnum)
    .process(file);
  return file;
};
