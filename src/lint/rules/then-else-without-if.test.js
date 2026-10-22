import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import thenElseWithoutIf from "./then-else-without-if.js";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(thenElseWithoutIf)
    .process(file);
  return file;
};

describe("then-else-without-if", () => {
  test("then without if", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "then": { "minLength": 1 } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'then' has no effect without 'if'"]);
    expect(file.messages[0].ruleId).to.equal("then-else-without-if");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 44, offset: 43 },
      end: { line: 1, column: 70, offset: 69 }
    });
  });

  test("else without if", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "else": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'else' has no effect without 'if'"]);
  });

  test("then and else with if", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "if": true, "then": true, "else": true }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "then": true } } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'then' has no effect without 'if'"]);
  });

  test("a property named then isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "then": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("a dialect without if", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-06/schema#", "then": true }`);
    expect(file.messages).to.eql([]);
  });
});
