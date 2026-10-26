import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import invalidDialectUri from "./invalid-dialect-uri.js";

const v1 = "https://json-schema.org/v1";

describe("invalid-dialect-uri", () => {
  test("v1 with an empty fragment", async () => {
    const file = await lint(`{ "$schema": "${v1}#", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'$schema' can't have a fragment in v1, not even an empty one. Use '${v1}'.`
    ]);
    expect(file.messages[0].ruleId).to.equal("invalid-dialect-uri");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 14, offset: 13 },
      end: { line: 1, column: 43, offset: 42 }
    });
  });

  test("v1 that isn't normalized", async () => {
    const file = await lint(`{ "$schema": "HTTPS://json-schema.org/%76%31", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'$schema' must be normalized in v1. Use '${v1}'.`
    ]);
  });

  test("v1", async () => {
    const file = await lint(`{ "$schema": "${v1}", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("in an embedded resource", async () => {
    const file = await lint(`{
      "$schema": "${v1}",
      "$defs": {
        "foo": { "$schema": "${v1}#", "$id": "https://example.com/foo" }
      }
    }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'$schema' can't have a fragment in v1, not even an empty one. Use '${v1}'.`
    ]);
  });

  test("a property named $schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "properties": { "$schema": { "const": "${v1}#" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("other dialects aren't reported", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema#", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(invalidDialectUri)
    .process(file);
  return file;
};
