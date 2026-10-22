import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import constOrEnumValueForDisallowedType from "./const-or-enum-value-for-disallowed-type.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(constOrEnumValueForDisallowedType)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("const-or-enum-value-for-disallowed-type", () => {
  test("an enum value type doesn't allow", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "string", "enum": ["a", null] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["This value is null, which 'type' doesn't allow, so it's never valid"]);
    expect(file.messages[0].ruleId).to.equal("const-or-enum-value-for-disallowed-type");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf("null");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 5, offset: offset + 4 }
    });
  });

  test("each value is reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "enum": ["1", 2, "3"] }`)).to.eql([
      "This value is a string, which 'type' doesn't allow, so it's never valid",
      "This value is a string, which 'type' doesn't allow, so it's never valid"
    ]);
  });

  test("a number that isn't an integer", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "enum": [1, 1.0, 1.5] }`)).to.eql([
      "This value is a number that isn't an integer, which 'type' doesn't allow, so it's never valid"
    ]);
  });

  test("a const value type doesn't allow", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "const": 1.5 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "The 'const' value is a number that isn't an integer, which 'type' doesn't allow, so nothing is valid"
    ]);
    expect(file.messages[0].column).to.equal(json.indexOf(`"const"`) + 1);
  });

  test("structured values", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "enum": [{ "a": 1 }, [1]] }`)).to.eql([
      "This value is an array, which 'type' doesn't allow, so it's never valid"
    ]);
  });

  test("every value is allowed", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["number", "null"], "enum": [1.5, null], "const": 2 }`)).to.eql([]);
  });

  test("without type", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "enum": ["a", null] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "foo": { "type": "boolean", "enum": ["true"] } } }`)).to.have.length(1);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "number", "enum": ["1"] }`)).to.have.length(1);
  });
});
