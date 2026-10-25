import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import unknownKeyword from "./unknown-keyword.js";

/**
 * @import { UnknownKeywordOptions } from "./unknown-keyword.d.ts"
 */

const v1 = "https://json-schema.org/v1";
const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("unknown-keyword", () => {
  test("a misspelled keyword", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properites": {} }`);
    expect(file.messages.map((message) => message.reason)).to.eql([
      "'properites' isn't a keyword in this dialect. Did you mean 'properties'?"
    ]);
    expect(file.messages[0].ruleId).to.equal("unknown-keyword");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 62, offset: 61 },
      end: { line: 1, column: 78, offset: 77 }
    });
  });

  test("in every dialect where unknown keywords are allowed", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "minLenght": 1 }`)).to.eql([
      "'minLenght' isn't a keyword in this dialect. Did you mean 'minLength'?"
    ]);
    expect(await reasons(`{ "$schema": "${draft04}", "Required": ["a"] }`)).to.eql([
      "'Required' isn't a keyword in this dialect. Did you mean 'required'?"
    ]);
  });

  test("a keyword from another dialect", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "prefixItems": [] }`)).to.eql([
      "'prefixItems' isn't a keyword in this dialect"
    ]);
  });

  test("nothing close", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "x-internal": true }`)).to.eql([
      "'x-internal' isn't a keyword in this dialect"
    ]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": { "tpye": "string" } } }`)).to.eql([
      "'tpye' isn't a keyword in this dialect. Did you mean 'type'?"
    ]);
  });

  test("ignored names", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "x-internal": true, "tsType": "Foo", "foo": 1 }`, { ignore: ["x-internal", "tsType"] }))
      .to.eql(["'foo' isn't a keyword in this dialect"]);
  });

  test("$comment in a dialect without it", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "$comment": "a" }`)).to.eql([]);
  });

  test("definitions in a dialect with $defs is misnamed-definitions'", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "definitions": {} }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft07}", "$defs": {} }`)).to.eql([]);
  });

  test("v1, where the resolver reports them", async () => {
    expect(await reasons(`{ "$schema": "${v1}", "x-internal": true }`)).to.eql([]);
  });

  test("properties named like keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "properties": { "foo": {} }, "$defs": { "bar": {} } }`)).to.eql([]);
  });

  test("a draft-07 reference's siblings", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "properties": { "a": { "$ref": "#", "foo": 1 } } }`)).to.eql([]);
  });
});

/** @type (json: string, options?: UnknownKeywordOptions) => Promise<VFile> */
const lint = async (json, options) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(unknownKeyword, options && ["warn", options])
    .process(file);
  return file;
};

/** @type (json: string, options?: UnknownKeywordOptions) => Promise<string[]> */
const reasons = async (json, options) => (await lint(json, options)).messages.map((message) => message.reason);
