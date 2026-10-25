import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import readOnlyAndWriteOnly from "./read-only-and-write-only.js";

describe("read-only-and-write-only", () => {
  test("readOnly and writeOnly both true", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "readOnly": true, "writeOnly": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'readOnly' and 'writeOnly' are both true, so the value is never retrieved and can't be changed"
    ]);
    expect(file.messages[0].ruleId).to.equal("read-only-and-write-only");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 79, offset: 78 }
    });
  });

  test("the message is on whichever comes second", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "writeOnly": true, "readOnly": true }`);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 63, offset: 62 },
      end: { line: 1, column: 79, offset: 78 }
    });
  });

  test("only one is true", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "readOnly": true, "writeOnly": false }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "foo": { "readOnly": true, "writeOnly": true } } }`);
    expect(file.messages).to.have.length(1);
  });

  test("in different schemas", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "readOnly": true, "properties": { "foo": { "writeOnly": true } } }`);
    expect(file.messages).to.eql([]);
  });

  test("properties named readOnly and writeOnly aren't keywords", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "properties": { "readOnly": true, "writeOnly": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("a dialect without them", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-06/schema#", "readOnly": true, "writeOnly": true }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(readOnlyAndWriteOnly)
    .process(file);
  return file;
};
