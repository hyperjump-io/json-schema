import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import duplicateOneOfSchemas from "./duplicate-one-of-schemas.js";

describe("duplicate-one-of-schemas", () => {
  test("a duplicate schema", async () => {
    const json = `{ "$schema": "https://json-schema.org/v1", "oneOf": [{ "type": "string" }, { "type": "number" }, { "type": "string" }] }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "This schema is already in 'oneOf', so a value it matches always fails 'oneOf'"
    ]);
    expect(file.messages[0].ruleId).to.equal("duplicate-one-of-schemas");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const offset = json.lastIndexOf(`{ "type": "string" }`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + 21, offset: offset + 20 }
    });
  });

  test("schemas with keywords in a different order", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "oneOf": [{ "type": "string", "minLength": 1 }, { "minLength": 1, "type": "string" }] }`);
    expect(file.messages).to.have.length(1);
  });

  test("boolean schemas", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "oneOf": [true, true] }`);
    expect(file.messages).to.have.length(1);
  });

  test("different schemas", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "oneOf": [true, {}, { "type": "string" }, { "type": ["string"] }] }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "oneOf": [{}, {}] } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named oneOf isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "oneOf": {} } }`);
    expect(file.messages).to.eql([]);
  });

  test("references in draft-04", async () => {
    const file = await lint(`{
      "$schema": "http://json-schema.org/draft-04/schema#",
      "definitions": { "a": {} },
      "oneOf": [{ "$ref": "#/definitions/a" }, { "$ref": "#/definitions/a" }]
    }`);
    expect(file.messages).to.have.length(1);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(duplicateOneOfSchemas)
    .process(file);
  return file;
};
