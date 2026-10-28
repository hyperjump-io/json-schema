import { describe, test, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import relativeRootId from "./relative-root-id.js";

const draft04 = "http://json-schema.org/draft-04/schema#";
const draft07 = "http://json-schema.org/draft-07/schema#";
const draft202012 = "https://json-schema.org/draft/2020-12/schema";

describe("relative-root-id", () => {
  test("a relative root $id", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "$id": "/user" }`);
    expect(ruleMessages(file).map((message) => message.reason)).to.eql([
      "'/user' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root '$id' an absolute URI so the schema has the same identifier wherever it is."
    ]);
    const [message] = ruleMessages(file);
    expect(message.ruleId).to.equal("relative-root-id");
    expect(message.source).to.equal("json-schema-lint");
    expect(message.fatal).to.equal(false);
    expect(message.place).to.eql({
      start: { line: 1, column: 69, offset: 68 },
      end: { line: 1, column: 76, offset: 75 }
    });
  });

  test("an absolute root $id", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "$id": "https://example.com/user" }`);
    expect(file.messages).to.eql([]);
  });

  test("no $id", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "type": "string" }`);
    expect(file.messages).to.eql([]);
  });

  test("a relative $id in an embedded resource", async () => {
    const file = await lint(`{
      "$schema": "${draft202012}",
      "$id": "https://example.com/user",
      "$defs": {
        "name": { "$id": "name" }
      }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a property named $id", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "properties": { "$id": { "const": "foo" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("a relative root $id in draft-07", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "$id": "user.schema.json" }`);
    expect(ruleMessages(file).map((message) => message.ruleId)).to.eql(["relative-root-id"]);
  });

  test("a fragment-only root $id in draft-07", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "$id": "#user" }`);
    expect(file.messages).to.eql([]);
  });

  test("a relative root id in draft-04", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "id": "user.schema.json" }`);
    expect(ruleMessages(file).map((message) => message.reason)).to.eql([
      "'user.schema.json' is relative, so the schema is identified by resolving it against wherever the schema was retrieved from. Give the root 'id' an absolute URI so the schema has the same identifier wherever it is."
    ]);
  });

  test("$id in draft-04 isn't an identifier", async () => {
    const file = await lint(`{ "$schema": "${draft04}", "$id": "user.schema.json" }`);
    expect(file.messages).to.eql([]);
  });

  test("an $id that isn't a string", async () => {
    const file = await lint(`{ "$schema": "${draft202012}", "$id": 42 }`);
    expect(file.messages.filter((message) => message.ruleId === "relative-root-id")).to.eql([]);
  });
});

/** @type (json: string) => Promise<VFile> */
const lint = async (json) => {
  const file = new VFile({ path: "/schemas/a.schema.json", value: json });
  await linter()
    .use(relativeRootId)
    .process(file);
  return file;
};

/**
 * The rule's messages. In a file, a relative root `$id` resolves to a
 * `file:` URI, which the resolver reports too.
 *
 * @type (file: VFile) => VFile["messages"]
 */
const ruleMessages = (file) => file.messages.filter((message) => message.ruleId === "relative-root-id");
