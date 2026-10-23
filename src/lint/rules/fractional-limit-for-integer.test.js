import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import fractionalLimitForInteger from "./fractional-limit-for-integer.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(fractionalLimitForInteger)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("fractional-limit-for-integer", () => {
  test("a fractional maximum", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "maximum": 7.8 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'maximum' isn't an integer, but 'type' only allows integers, so it's the same as 7"
    ]);
    expect(file.messages[0].ruleId).to.equal("fractional-limit-for-integer");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"maximum": 7.8`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("a fractional minimum rounds up", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "minimum": 3.2 }`)).to.eql([
      "'minimum' isn't an integer, but 'type' only allows integers, so it's the same as 4"
    ]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "minimum": -3.2 }`)).to.eql([
      "'minimum' isn't an integer, but 'type' only allows integers, so it's the same as -3"
    ]);
  });

  test("fractional exclusive limits", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "exclusiveMaximum": 7.8, "exclusiveMinimum": 0.5 }`)).to.eql([
      "'exclusiveMaximum' isn't an integer, but 'type' only allows integers, so it's the same as 'maximum': 7",
      "'exclusiveMinimum' isn't an integer, but 'type' only allows integers, so it's the same as 'minimum': 1"
    ]);
  });

  test("integer limits", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "maximum": 7, "minimum": 1.0 }`)).to.eql([]);
  });

  test("a type that allows other numbers", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "number", "maximum": 7.8 }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["integer", "number"], "maximum": 7.8 }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "maximum": 7.8 }`)).to.eql([]);
  });

  test("integer with other types that aren't numbers", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": ["integer", "null"], "maximum": 7.8 }`)).to.have.length(1);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "type": "integer", "maximum": 7.8 } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "type": { "const": "integer" }, "maximum": { "const": 7.8 } } }`)).to.eql([]);
  });

  test("draft-06", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-06/schema#", "type": "integer", "maximum": 7.8 }`)).to.have.length(1);
  });

  test("draft-04's limits aren't checked", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "integer", "maximum": 7.8 }`)).to.eql([]);
  });
});
