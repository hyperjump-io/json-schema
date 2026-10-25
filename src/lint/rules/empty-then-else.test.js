import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import emptyThenElse from "./empty-then-else.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("empty-then-else", () => {
  test("an empty then", async () => {
    const json = `{ "$schema": "${draft2020}", "if": { "required": ["a"] }, "then": {} }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'then' has no effect, because every value is valid against it"]);
    expect(file.messages[0].ruleId).to.equal("empty-then-else");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"then": {}`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("an empty else, true, or only a comment", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "then": true, "else": { "$comment": "todo" } }`)).to.eql([
      "'then' has no effect, because every value is valid against it",
      "'else' has no effect, because every value is valid against it"
    ]);
  });

  test("annotations aren't empty", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "then": { "description": "an a" } }`)).to.eql([]);
  });

  test("false isn't empty", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "then": false }`)).to.eql([]);
  });

  test("without if", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "then": {} }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "if": true, "else": {} } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "if": true, "then": {} } }`)).to.eql([]);
  });

  test("draft-07", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "if": true, "then": {} }`)).to.have.length(1);
  });

  test("draft-06 doesn't have if", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-06/schema#", "if": true, "then": {} }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(emptyThenElse)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
