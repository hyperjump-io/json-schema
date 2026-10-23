import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import requiredDependentProperty from "./required-dependent-property.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(requiredDependentProperty)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

const noEffect = "'b' is in 'required', so requiring it here has no effect";

describe("required-dependent-property", () => {
  test("a dependent property that's required", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "required": ["b"], "dependentRequired": { "a": ["b", "c"] } }`);
    expect(file.messages.map((message) => message.reason)).to.eql([noEffect]);
    expect(file.messages[0].ruleId).to.equal("required-dependent-property");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: 110, offset: 109 },
      end: { line: 1, column: 113, offset: 112 }
    });
  });

  test("dependent properties that aren't required", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "required": ["c"], "dependentRequired": { "a": ["b"] } }`)).to.eql([]);
  });

  test("without required", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "dependentRequired": { "a": ["b"] } }`)).to.eql([]);
  });

  test("a dependency on a required property", async () => {
    expect(await reasons(`{ "$schema": "${draft202012}", "required": ["a", "b"], "dependentRequired": { "a": ["b"] } }`)).to.eql([]);
  });

  test("dependencies in draft-07", async () => {
    expect(await reasons(`{ "$schema": "${draft07}", "required": ["b"], "dependencies": { "a": ["b"], "c": { "required": ["b"] } } }`)).to.eql([noEffect]);
  });

  test("dependencies in draft-04", async () => {
    expect(await reasons(`{ "$schema": "${draft04}", "required": ["b"], "dependencies": { "a": ["b"] } }`)).to.eql([noEffect]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "properties": { "foo": { "required": ["b"], "dependentRequired": { "a": ["b"] } } }
    }`)).to.eql([noEffect]);
  });

  test("a property named dependentRequired", async () => {
    expect(await reasons(`{
      "$schema": "${draft202012}",
      "required": ["b"],
      "properties": { "dependentRequired": { "const": { "a": ["b"] } } }
    }`)).to.eql([]);
  });
});
