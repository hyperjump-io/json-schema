import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import duplicateAllOfAnyOfSchemas from "./duplicate-all-of-any-of-schemas.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(duplicateAllOfAnyOfSchemas)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

describe("duplicate-all-of-any-of-schemas", () => {
  test("a duplicate in allOf", async () => {
    const json = `{ "$schema": "${draft2020}", "allOf": [{ "type": "string" }, { "type": "string" }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["This schema is already in 'allOf', so it has no effect"]);
    expect(file.messages[0].ruleId).to.equal("duplicate-all-of-any-of-schemas");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.lastIndexOf(`{ "type": "string" }`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 21, offset: offset + 20 }
    });
  });

  test("a duplicate in anyOf", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "anyOf": [{ "type": "integer" }, { "type": "integer" }, { "type": "string" }] }`)).to.eql([
      "This schema is already in 'anyOf', so it has no effect"
    ]);
  });

  test("schemas are compared as JSON values", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [{ "minimum": 1, "type": "integer" }, { "type": "integer", "minimum": 1.0 }] }`)).to.have.length(1);
    expect(await reasons(`{ "$schema": "${draft2020}", "allOf": [true, {}] }`)).to.eql([]);
  });

  test("oneOf isn't reported", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "oneOf": [true, true] }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "anyOf": [false, false] } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "allOf": { "enum": [[true, true]] }, "anyOf": { "const": [1, 1] } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "allOf": [{}, {}] }`)).to.have.length(1);
  });
});
