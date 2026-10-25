import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import minMaxContainsWithoutContains from "./min-max-contains-without-contains.js";

describe("min-max-contains-without-contains", () => {
  test("minContains without contains", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "minContains": 1 }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minContains' has no effect without 'contains'"]);
    expect(file.messages[0].ruleId).to.equal("min-max-contains-without-contains");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 44, offset: 43 },
      end: { line: 1, column: 60, offset: 59 }
    });
  });

  test("maxContains without contains", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "maxContains": 1 }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'maxContains' has no effect without 'contains'"]);
  });

  test("minContains and maxContains with contains", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "contains": true, "minContains": 1, "maxContains": 2 }`);
    expect(file.messages).to.eql([]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "items": { "minContains": 1 } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'minContains' has no effect without 'contains'"]);
  });

  test("in 2019-09", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2019-09/schema", "maxContains": 1 }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'maxContains' has no effect without 'contains'"]);
  });

  test("a dialect without minContains", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-07/schema#", "minContains": 1 }`);
    expect(file.messages).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(minMaxContainsWithoutContains)
    .process(file);
  return file;
};
