import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import constAndEnum from "./const-and-enum.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

const redundant = "'enum' has no effect, because 'const' allows only one value, which is in it";
const contradiction = "The 'const' value isn't in 'enum', so nothing is valid";

describe("const-and-enum", () => {
  test("the const value is in enum", async () => {
    const json = `{ "$schema": "${draft2020}", "enum": [5, 6], "const": 5 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([redundant]);
    expect(file.messages[0].ruleId).to.equal("const-and-enum");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"enum"`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 15, offset: offset + 14 }
    });
  });

  test("the const value isn't in enum", async () => {
    const json = `{ "$schema": "${draft2020}", "const": 7, "enum": [5, 6] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([contradiction]);
    expect(file.messages[0].column).to.equal(json.indexOf(`"enum"`) + 1);
  });

  test("the contradiction is reported on whichever comes second", async () => {
    const json = `{ "$schema": "${draft2020}", "enum": [5, 6], "const": 7 }`;
    const file = await lint(json);
    expect(file.messages[0].column).to.equal(json.indexOf(`"const"`) + 1);
  });

  test("values are compared as JSON Schema does", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "const": { "a": 1, "b": [1.0] }, "enum": [{ "b": [1], "a": 1.0 }] }`)).to.eql([redundant]);
    expect(await reasons(`{ "$schema": "${draft2020}", "const": "1", "enum": [1] }`)).to.eql([contradiction]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "foo": { "const": null, "enum": [null] } } }`)).to.eql([redundant]);
  });

  test("a property named const", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "const": { "enum": [1] }, "enum": { "const": 2 } } }`)).to.eql([]);
  });

  test("const alone", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "const": 5 }`)).to.eql([]);
  });

  test("draft-06", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-06/schema#", "const": 5, "enum": [6] }`)).to.eql([contradiction]);
  });

  test("draft-04 doesn't have const", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "const": 5, "enum": [6] }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(constAndEnum)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
