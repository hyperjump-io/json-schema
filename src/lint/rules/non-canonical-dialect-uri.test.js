import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import nonCanonicalDialectUri from "./non-canonical-dialect-uri.js";

const draft07 = "http://json-schema.org/draft-07/schema";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("non-canonical-dialect-uri", () => {
  test("draft-07 without the empty fragment", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'${draft07}' should be '${draft07}#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.`
    ]);
    expect(file.messages[0].ruleId).to.equal("non-canonical-dialect-uri");
    expect(file.messages[0].source).to.equal("json-schema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 14, offset: 13 },
      end: { line: 1, column: 54, offset: 53 }
    });
  });

  test("draft-07 with the empty fragment", async () => {
    const file = await lint(`{ "$schema": "${draft07}#", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("draft-04 without the empty fragment", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-04/schema", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'http://json-schema.org/draft-04/schema' should be 'http://json-schema.org/draft-04/schema#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it."
    ]);
  });

  test("2020-12 with an empty fragment", async () => {
    const file = await lint(`{ "$schema": "${draft202012}#", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'${draft202012}#' should be '${draft202012}', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.`
    ]);
  });

  test("2020-12 without a fragment", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("2019-09 with an empty fragment", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2019-09/schema#" }`);
    expect(file.messages).to.have.length(1);
  });

  test("in an embedded resource", async () => {
    const file = await lint(`{
      "$schema": "${draft202012}",
      "$defs": {
        "foo": { "$schema": "${draft07}", "$id": "https://example.com/foo" }
      }
    }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'${draft07}' should be '${draft07}#', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it.`
    ]);
  });

  test("next to a draft-07 $ref", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "$ref": "#/definitions/foo", "definitions": { "foo": {} } }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql(["non-canonical-dialect-uri"]);
  });

  test("a property named $schema", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properties": { "$schema": { "type": "string" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("not normalized", async () => {
    const file = await lint(`{ "$schema": "HTTP://json-schema.org/draft-07/schema", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `'HTTP://json-schema.org/draft-07/schema' isn't normalized, so implementations that compare dialect URIs as strings won't recognize it. Use '${draft07}#'.`
    ]);
  });

  test("a fragment that isn't empty", async () => {
    const file = await lint(`{ "$schema": "${draft202012}#/$defs/foo", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `The fragment '#/$defs/foo' isn't part of the dialect. Use '${draft202012}'.`
    ]);
  });

  test("a fragment that isn't empty in draft-07", async () => {
    const file = await lint(`{ "$schema": "${draft07}#foo", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      `The fragment '#foo' isn't part of the dialect. Use '${draft07}#'.`
    ]);
  });

  test("v1", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1#", "type": "string" }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'https://json-schema.org/v1#' should be 'https://json-schema.org/v1', the URI its meta-schema identifies itself with. Implementations that compare dialect URIs as strings won't recognize it."
    ]);
  });

  test("a $schema that isn't a string", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "$defs": { "foo": { "$schema": 42 } } }`);
    expect(file.messages.filter((message) => message.ruleId === "non-canonical-dialect-uri")).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(nonCanonicalDialectUri)
    .process(file);
  return file;
};
