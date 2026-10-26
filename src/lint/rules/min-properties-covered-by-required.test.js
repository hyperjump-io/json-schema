import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import minPropertiesCoveredByRequired from "./min-properties-covered-by-required.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("min-properties-covered-by-required", () => {
  test("minProperties equal to the number of required properties", async () => {
    const json = `{ "$schema": "${draft2020}", "required": ["a", "b"], "minProperties": 2 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minProperties' has no effect, because 'required' already requires 2 properties"]);
    expect(file.messages[0].ruleId).to.equal("min-properties-covered-by-required");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"minProperties": 2`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("minProperties less than the number of required properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minProperties": 1, "required": ["a", "b"] }`)).to.eql([
      "'minProperties' has no effect, because 'required' already requires 2 properties"
    ]);
  });

  test("one required property", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minProperties": 1, "required": ["a"] }`)).to.eql([
      "'minProperties' has no effect, because 'required' already requires 1 property"
    ]);
  });

  test("minProperties greater than the number of required properties", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minProperties": 3, "required": ["a", "b"] }`)).to.eql([]);
  });

  test("without required", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minProperties": 1 }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "required": ["a"], "minProperties": 1 } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "required": { "minProperties": 1 }, "minProperties": true } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "required": ["a"], "minProperties": 1 }`)).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(minPropertiesCoveredByRequired)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
