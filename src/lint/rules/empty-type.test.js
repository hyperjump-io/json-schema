import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import emptyType from "./empty-type.js";

const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("empty-type", () => {
  test("an empty type", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": [] }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'type' is empty, so nothing is valid against it"]);
    expect(file.messages[0].ruleId).to.equal("empty-type");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 72, offset: 71 }
    });
  });

  test("a type with types", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": ["string"] }`);
    expect(file.messages).to.eql([]);
  });

  test("a type that's a string", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properties": { "foo": { "type": [] } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("a property named type isn't a keyword", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properties": { "type": {} } }`);
    expect(file.messages).to.eql([]);
  });

  test("draft-04", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": [] }`);
    expect(file.messages).to.have.length(1);
  });

  test("an empty type is a schema problem in v1, not lint", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "type": [] }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["https://json-schema.org/keyword/type"]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(emptyType)
    .process(file);
  return file;
};
