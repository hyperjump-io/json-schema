import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import ifWithoutThenElse from "./if-without-then-else.js";

describe("if-without-then-else", () => {
  test("if without then or else", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "if": { "minLength": 1 } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'if' without 'then' or 'else' only collects annotations"]);
    expect(file.messages[0].ruleId).to.equal("if-without-then-else");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 44, offset: 43 },
      end: { line: 1, column: 68, offset: 67 }
    });
  });

  test("if with then", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "if": true, "then": true }`);
    expect(file.messages).to.eql([]);
  });

  test("if with else", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "if": true, "else": true }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "if": true } } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'if' without 'then' or 'else' only collects annotations"]);
  });

  test("a property named if isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "if": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("a dialect without if", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-06/schema#", "if": true }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(ifWithoutThenElse)
    .process(file);
  return file;
};
