import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { hyperjump } from "../../cli/hyperjump.js";
import unsafeIntegerLimit from "./unsafe-integer-limit.js";

const draft2020 = "https://json-schema.org/draft/2020-12/schema";

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await hyperjump()
    .use(unsafeIntegerLimit)
    .process(file);
  return file;
};

/** @type (json: string) => Promise<string[]> */
const reasons = async (json) => (await lint(json)).messages.map((message) => message.reason);

/** @type (name: string) => string */
const message = (name) => `'${name}' is beyond the integers a double can represent exactly, so implementations that use doubles may compare it inexactly`;

describe("unsafe-integer-limit", () => {
  test("limits beyond the safe range", async () => {
    const json = `{ "$schema": "${draft2020}", "type": "integer", "maximum": 90071992547409980, "minimum": -90071992547409980 }`;
    const file = await lint(json);
    expect(file.messages.map((message) => message.reason)).to.eql([message("maximum"), message("minimum")]);
    expect(file.messages[0].ruleId).to.equal("unsafe-integer-limit");
    expect(file.messages[0].source).to.equal("jsonschema-lint");
    expect(file.messages[0].fatal).to.equal(false);
    const keyword = `"maximum": 90071992547409980`;
    const offset = json.indexOf(keyword);
    expect(file.messages[0].place).to.eql({
      start: { line: 1, column: offset + 1, offset },
      end: { line: 1, column: offset + keyword.length + 1, offset: offset + keyword.length }
    });
  });

  test("limits at the edge of the safe range", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "maximum": 9007199254740991, "minimum": -9007199254740991 }`)).to.eql([]);
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "integer", "exclusiveMaximum": 9007199254740992 }`)).to.eql([message("exclusiveMaximum")]);
  });

  test("a type that allows other numbers", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "number", "maximum": 1e300 }`)).to.eql([]);
  });

  test("in a subschema", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "items": { "type": "integer", "maximum": 9223372036854775807 } }`)).to.have.length(1);
  });

  test("properties named like the keywords", async () => {
    expect(await reasons(`{ "$schema": "${draft2020}", "type": "object", "properties": { "maximum": { "const": 9223372036854775807 } } }`)).to.eql([]);
  });

  test("draft-04", async () => {
    expect(await reasons(`{ "$schema": "http://json-schema.org/draft-04/schema#", "type": "integer", "maximum": 9223372036854775807 }`)).to.have.length(1);
  });
});
