import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import exclusiveWithoutMaximumMinimum from "./exclusive-without-maximum-minimum.js";

const draft04 = "http://json-schema.org/draft-04/schema#";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(exclusiveWithoutMaximumMinimum)
    .process(file);
  return file;
};

describe("exclusive-without-maximum-minimum", () => {
  test("exclusiveMaximum without maximum", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "exclusiveMaximum": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMaximum' has no effect without 'maximum'"]);
    expect(file.messages[0].ruleId).to.equal("exclusive-without-maximum-minimum");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
  });

  test("exclusiveMinimum without minimum", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "exclusiveMinimum": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMinimum' has no effect without 'minimum'"]);
  });

  test("exclusiveMaximum and exclusiveMinimum with maximum and minimum", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "maximum": 5, "exclusiveMaximum": true, "minimum": 1, "exclusiveMinimum": true }`);
    expect(file.messages).to.eql([]);
  });

  test("the wrong limit doesn't count", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "minimum": 1, "exclusiveMaximum": true }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMaximum' has no effect without 'maximum'"]);
  });

  test("in a subschema", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "properties": { "foo": { "exclusiveMaximum": true } } }`);
    expect(file.messages.map((message) => message.reason)).to.eql(["'exclusiveMaximum' has no effect without 'maximum'"]);
  });

  test("exclusiveMaximum works on its own after draft-04", async () => {
    const file = await lint(`{ "$schema": "http://json-schema.org/draft-06/schema#", "exclusiveMaximum": 5 }`);
    expect(file.messages).to.eql([]);
  });
});
