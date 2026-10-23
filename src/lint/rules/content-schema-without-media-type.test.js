import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import contentSchemaWithoutMediaType from "./content-schema-without-media-type.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(contentSchemaWithoutMediaType)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const message = "'contentSchema' has no effect without 'contentMediaType'";

describe("content-schema-without-media-type", () => {
  test("contentSchema without contentMediaType", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "string", "contentSchema": { "type": "object" } }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message]);
    expect(file.messages[0].ruleId).to.equal("content-schema-without-media-type");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"contentSchema": { "type": "object" }`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("contentSchema with contentMediaType", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "contentMediaType": "application/json", "contentSchema": { "type": "object" } }`)).to.eql([]);
  });

  test("contentEncoding isn't enough", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "contentEncoding": "base64", "contentSchema": true }`)).to.eql([message]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "foo": { "contentSchema": true } } }`)).to.eql([message]);
  });

  test("a property named contentSchema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "properties": { "contentSchema": true } }`)).to.eql([]);
  });

  test("2019-09", async () => {
    expect(await reasons(`{ "$schema": "https://json-schema.org/draft/2019-09/schema", "contentSchema": true }`)).to.eql([message]);
  });

  test("draft-07 doesn't have contentSchema", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-07/schema#", "contentSchema": true }`)).to.eql([]);
  });
});
