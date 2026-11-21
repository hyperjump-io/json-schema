import { describe, test, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, Hyperjump } from "@hyperjump/browser";
import { jsonSchemaConfig } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { openApi30Dialect, openApi30DialectUri } from "../dialects/openapi-3-0/index.js";
import recommended from "./recommended.js";
import openApi30 from "./openapi-3-0.js";

/**
 * @import { Preset } from "unified"
 */

describe("openapi-3-0 preset", () => {
  test("has recommended's rules", async () => {
    const file = await lint(openApi30, `{ "type": "string", "minLength": 2, "maxLength": 1 }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["contradictory-limits", false]
    ]);
  });

  test("array-without-items is an error", async () => {
    const file = await lint(openApi30, `{ "type": "array" }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["array-without-items", true]
    ]);
  });

  test("array-without-items isn't in recommended", async () => {
    const file = await lint(recommended, `{ "type": "array" }`);
    expect(file.messages.filter((message) => message.ruleId === "array-without-items")).to.eql([]);
  });

  test("read-only-and-write-only is an error", async () => {
    const file = await lint(openApi30, `{ "readOnly": true, "writeOnly": true }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["read-only-and-write-only", true]
    ]);
  });

  test("implicit-dialect is off", async () => {
    const file = await lint(openApi30, `{ "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("unknown-field is a warning", async () => {
    const file = await lint(openApi30, `{ "xml": { "nme": "pet" } }`);
    expect(file.messages.map((message) => [message.ruleId, message.fatal])).to.eql([
      ["unknown-field", false]
    ]);
  });

  test("read-only-and-write-only is still a warning in recommended", async () => {
    const file = await lint(recommended, `{ "readOnly": true, "writeOnly": true }`);
    const messages = file.messages.filter((message) => message.ruleId === "read-only-and-write-only");
    expect(messages.map((message) => message.fatal)).to.eql([false]);
  });
});

/** @type (preset: Preset, json: string) => Promise<VFile> */
const lint = async (preset, json) => {
  const jsonSchema = jsonSchemaConfig({ dialects: [openApi30Dialect] });
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  const processor = unified()
    .use(rejsonParse)
    .use(jsonSchemaResolve, { session: new Hyperjump({ ...jsonSchema, allowRetrieval: [] }), dialectUri: openApi30DialectUri })
    .use(preset);
  await processor.run(processor.parse(file), file);
  return file;
};
