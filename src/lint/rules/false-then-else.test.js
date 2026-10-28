import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import falseThenElse from "./false-then-else.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

describe("false-then-else", () => {
  test("then false", async () => {
    const json = `{ "$schema": "${draft2020}", "if": { "required": ["a"] }, "then": false }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'if' with a 'then' that allows nothing is the same as 'not' with the 'if' schema"]);
    expect(file.messages[0].ruleId).to.equal("false-then-else");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"then": false`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("else false", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": { "required": ["a"] }, "else": false }`)).to.eql([
      "'if' with an 'else' that allows nothing is the same as the 'if' schema on its own"
    ]);
  });

  test("both false", async () => {
    const json = `{ "$schema": "${draft2020}", "if": true, "else": false, "then": false }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'then' and 'else' both allow nothing, so nothing is valid"]);
    expect(file.messages[0].column).to.equal(json.indexOf(`"then"`) + 1);
  });

  test("false with the other branch", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "then": false, "else": { "type": "string" } }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "if": true, "then": { "type": "string" }, "else": false }`)).to.eql([]);
  });

  test("a schema that allows nothing", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "if": { "required": ["a"] }, "then": { "type": "string", "const": 1 } }`)).to.eql([
      "'if' with a 'then' that allows nothing is the same as 'not' with the 'if' schema"
    ]);
  });

  test("without if", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "then": false }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "if": true, "then": false } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "if": true, "then": false } }`)).to.eql([]);
  });

  test("draft-07", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "if": true, "else": false }`)).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(falseThenElse)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
