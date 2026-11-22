import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import embeddedDialectChange from "./embedded-dialect-change.js";

const draft07 = "http://json-schema.org/draft-07/schema#";
const draft201909 = "https://json-schema.org/draft/2019-09/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("embedded-dialect-change", () => {
  test("an embedded resource in another dialect in 2019-09", async () => {
    const json = `{ "$schema": "${draft201909}", "$defs": { "a": { "$id": "https://example.com/a", "$schema": "${draft07}" } } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'$schema' names a different dialect from the schema it's in. 2019-09 says a document's schema resources should have the same dialect."
    ]);
    expect(file.messages[0].ruleId).to.equal("embedded-dialect-change");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.lastIndexOf(`"$schema"`);
    const length = `"$schema": "${draft07}"`.length;
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 1 + length, offset: offset + length }
    });
  });

  test("the same dialect", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "$defs": { "a": { "$id": "https://example.com/a", "$schema": "${draft201909}" } } }`)).to.eql([]);
  });

  test("in 2020-12, which allows any dialect", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "$defs": { "a": { "$id": "https://example.com/a", "$schema": "${draft201909}" } } }`)).to.eql([]);
  });

  test("a 2019-09 resource in a 2020-12 document, changing back", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "$defs": {
        "a": {
          "$id": "https://example.com/a",
          "$schema": "${draft201909}",
          "$defs": { "b": { "$id": "https://example.com/b", "$schema": "${draft202012}" } }
        }
      }
    }`)).to.have.length(1);
  });

  test("a $schema where a resource doesn't start is ignored, so it's misplaced-dialect's", async () => {
    expect(await reasons(`{ "$schema": "${draft201909}", "items": { "$schema": "${draft07}" } }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(embeddedDialectChange)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
