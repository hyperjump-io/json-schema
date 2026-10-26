import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import minContainsZeroWithoutMaxContains from "./min-contains-zero-without-max-contains.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

const message = "'minContains' is 0 and there's no 'maxContains', so 'contains' never fails";

describe("min-contains-zero-without-max-contains", () => {
  test("minContains 0 without maxContains", async () => {
    const json = `{ "$schema": "${draft2020}", "contains": { "type": "number" }, "minContains": 0 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message]);
    expect(file.messages[0].ruleId).to.equal("min-contains-zero-without-max-contains");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"minContains": 0`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("with maxContains", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "contains": true, "minContains": 0, "maxContains": 10 }`)).to.eql([]);
  });

  test("minContains above 0", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "contains": true, "minContains": 1 }`)).to.eql([]);
  });

  test("without contains", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "minContains": 0 }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "contains": true, "minContains": 0 } }`)).to.eql([message]);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "contains": true, "minContains": { "const": 0 } } }`)).to.eql([]);
  });

  test("2019-09", async () => {
    expect(await reasons(`{ "$schema": "https://json-schema.org/draft/2019-09/schema", "contains": true, "minContains": 0 }`)).to.eql([message]);
  });

  test("draft-07 doesn't have minContains", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "contains": true, "minContains": 0 }`)).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(minContainsZeroWithoutMaxContains)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);
