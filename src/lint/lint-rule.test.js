import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "./test-linter.js";
import recommended from "./recommended.js";
import thenElseWithoutIf from "./rules/then-else-without-if.js";
import keywordWithoutType from "./rules/keyword-without-type.js";

describe("configuration comments", () => {
  test("a rule is off in the schema with the directive", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "then": true
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a rule is off in subschemas", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "properties": { "foo": { "then": true } }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a rule is still on outside the schema with the directive", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "properties": {
        "foo": { "$comment": "json-schema-lint-disable then-else-without-if", "then": true },
        "bar": { "then": true }
      },
      "else": true
    }`);
    expect(file.messages.map((message) => [message.reason, message.line])).to.eql([
      ["'then' has no effect without 'if'", 5],
      ["'else' has no effect without 'if'", 7]
    ]);
  });

  test("only the rules it names are off", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable min-max-contains-without-contains",
      "then": true,
      "minContains": 2
    }`);
    expect(ruleIds(file)).to.eql(["then-else-without-if"]);
  });

  test("it can name more than one rule", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if min-max-contains-without-contains",
      "then": true,
      "minContains": 2
    }`);
    expect(file.messages).to.eql([]);
  });

  test("every rule is off if it names none", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable",
      "then": true,
      "minContains": 2
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a directive inside a schema where the rule is already off doesn't turn it back on", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "properties": {
        "foo": { "$comment": "json-schema-lint-disable then-else-without-if" }
      },
      "then": true
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a comment that doesn't start with the directive is just a comment", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "Don't use json-schema-lint-disable here",
      "then": true
    }`);
    expect(ruleIds(file)).to.eql(["then-else-without-if"]);
  });

  test("schema problems can't be turned off", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable",
      "minLength": -1
    }`);
    expect(ruleIds(file)).to.eql(["https://json-schema.org/keyword/minLength"]);
  });

  test("$comment is a comment in a dialect without it", async () => {
    const file = await lint(`{
      "$schema": "http://json-schema.org/draft-04/schema#",
      "$comment": "json-schema-lint-disable",
      "properties": { "foo": { "$ref": "#/definitions/missing" } }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a rule is turned back on in a subschema", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "then": true,
      "properties": {
        "foo": { "$comment": "json-schema-lint-enable then-else-without-if", "then": true },
        "bar": { "then": true }
      }
    }`);
    expect(file.messages.map((message) => [message.ruleId, message.line])).to.eql([["then-else-without-if", 6]]);
  });

  test("every rule is turned back on if it names none", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable",
      "properties": {
        "foo": { "$comment": "json-schema-lint-enable", "then": true, "minContains": 2 }
      }
    }`);
    expect(ruleIds(file)).to.eql(["then-else-without-if", "min-max-contains-without-contains"]);
  });

  test("turning a rule off in a subschema of one that turned it on", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable",
      "properties": {
        "foo": {
          "$comment": "json-schema-lint-enable then-else-without-if",
          "properties": {
            "bar": { "$comment": "json-schema-lint-disable then-else-without-if", "then": true }
          },
          "else": true
        }
      }
    }`);
    expect(file.messages.map((message) => [message.ruleId, message.line])).to.eql([["then-else-without-if", 10]]);
  });

  test("an unknown rule is a warning", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/v1",
      "$comment": "json-schema-lint-disable then-else-without-if not-a-rule"
    }`);
    expect(file.messages.map((message) => [message.source, message.ruleId, message.reason, message.fatal, message.line])).to.eql([
      ["json-schema-lint", "unknown-rule", "Unknown rule 'not-a-rule' in 'json-schema-lint-disable'", false, 3]
    ]);
  });

  test("an unknown rule in an enable directive is a warning", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "$comment": "json-schema-lint-enable not-a-rule" }`);
    expect(ruleIds(file)).to.eql(["unknown-rule"]);
  });

  test("a rule that's off is known", async () => {
    const file = new VFile({
      path: "/schemas/a.schema.json",
      value: `{ "$schema": "https://json-schema.org/v1", "$comment": "json-schema-lint-disable then-else-without-if" }`
    });
    await linter()
      .use(recommended)
      .use(thenElseWithoutIf, ["off"])
      .process(file);
    expect(file.messages).to.eql([]);
  });

  test("an unknown directive is a warning", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "$comment": "json-schema-lint-ignore then-else-without-if", "then": true }`);
    expect(file.messages.map((message) => [message.ruleId, message.reason])).to.eql([
      ["unknown-directive", "Unknown directive 'json-schema-lint-ignore'. Expected 'json-schema-lint-disable' or 'json-schema-lint-enable'."],
      ["then-else-without-if", "'then' has no effect without 'if'"]
    ]);
  });

  test("warnings about directives can't be turned off", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/v1", "$comment": "json-schema-lint-disable not-a-rule", "properties": { "foo": { "$comment": "json-schema-lint-disable" } } }`);
    expect(ruleIds(file)).to.eql(["unknown-rule"]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  // The schemas leave out `type` to stay short
  await linter()
    .use(recommended)
    .use(keywordWithoutType, ["off"])
    .process(file);
  return file;
};

/** @type (file: VFile) => (string | undefined)[] */
const ruleIds = (file) => file.messages.map((message) => message.ruleId);
