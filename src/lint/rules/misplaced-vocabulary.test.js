import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import misplacedVocabulary from "./misplaced-vocabulary.js";

const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";
const core = "https://json-schema.org/draft/2020-12/vocab/core";

describe("misplaced-vocabulary", () => {
  test("$vocabulary in a subschema", async () => {
    const json = `{ "$schema": "${draft202012}", "properties": { "foo": { "$vocabulary": { "${core}": true } } } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql(["'$vocabulary' is only allowed at the root of the document. It's ignored."]);
    expect(file.messages[0].ruleId).to.equal("misplaced-vocabulary");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.indexOf(`"$vocabulary"`);
    const length = `"$vocabulary": { "${core}": true }`.length;
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 1 + length, offset: offset + length }
    });
  });

  test("2019-09", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "items": { "$vocabulary": {} } }`)).to.have.length(1);
  });

  test("at the root", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$vocabulary": { "${core}": true } }`)).to.eql([]);
  });

  test("at the root of an embedded resource", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$defs": { "a": { "$id": "https://example.com/a", "$vocabulary": { "${core}": true } } } }`)).to.eql([
      "'$vocabulary' is only allowed at the root of the document. It's ignored."
    ]);
  });

  test("a property named $vocabulary isn't a keyword", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "$vocabulary": { "type": "object" } } }`)).to.eql([]);
  });

  test("a dialect without $vocabulary", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "items": { "$vocabulary": {} } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(misplacedVocabulary)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
