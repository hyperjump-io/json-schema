import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { VFile } from "vfile";
import { linter } from "../test-linter.js";
import referenceWithoutTarget from "./reference-without-target.js";

const v1 = "https://json-schema.org/v1";
const draft07 = "http://json-schema.org/draft-07/schema#";

describe("reference-without-target", () => {
  /** A directory in the working directory, which can be retrieved from */
  let directory = "";

  beforeAll(async () => {
    directory = await mkdtemp(join(cwd(), ".reference-without-target-test-"));
    await writeFile(join(directory, "other.schema.json"), JSON.stringify({ $schema: v1, $defs: { foo: { type: "string" } } }));
    await writeFile(join(directory, "plain.json"), JSON.stringify({ type: "string" }));
    await writeFile(join(directory, "invalid.schema.json"), JSON.stringify({ $schema: v1, minLength: -1 }));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  /** @type (name: string) => string */
  const fromWorkingDirectory = (name) => relative(cwd(), join(directory, name));

  /** @type (json: string) => Promise<VFile> */
  const lint = async (json) => {
    const file = new VFile({ path: join(directory, "a.schema.json"), value: json });
    await linter()
      .use(referenceWithoutTarget)
      .process(file);
    return file;
  };

  /** @type (file: VFile) => string[] */
  const reasons = (file) => file.messages.map((message) => message.reason);

  test("a JSON Pointer into the same document that finds nothing", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#/$defs/bar", "$defs": { "foo": true } }`);
    // A file's location is relative to the working directory, so it doesn't
    // reveal where the file is
    expect(reasons(file)).to.eql([`The reference doesn't find a schema. Property 'bar' doesn't exist at ${fromWorkingDirectory("a.schema.json")}#/$defs/bar`]);
    expect(file.messages[0].cause).to.equal(undefined);
    expect(file.messages[0]).toMatchObject({
      ruleId: "reference-without-target",
      source: "json-schema-lint",
      fatal: false,
      place: { start: { line: 1, column: 52 }, end: { line: 1, column: 65 } }
    });
  });

  test("a JSON Pointer into the same document that finds a schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#/$defs/foo", "$defs": { "foo": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("an anchor that isn't in the document", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#foo" }`);
    expect(reasons(file)).to.eql([`The reference doesn't find a schema. There's no 'foo' anchor in '${fromWorkingDirectory("a.schema.json")}'`]);
  });

  test("a dynamic reference that finds nothing", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "$dynamicRef": "#meta" }`);
    expect(reasons(file)).toEqual([expect.stringContaining("There's no 'meta' anchor")]);
  });

  test("a dynamic reference that finds a schema", async () => {
    const file = await lint(`{ "$schema": "https://json-schema.org/draft/2020-12/schema", "$dynamicAnchor": "meta", "$dynamicRef": "#meta" }`);
    expect(file.messages).to.eql([]);
  });

  test("an embedded resource", async () => {
    const file = await lint(`{
      "$schema": "${v1}",
      "$ref": "https://example.com/embedded#/$defs/bar",
      "$defs": {
        "embedded": { "$id": "https://example.com/embedded", "$defs": { "bar": true } }
      }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a location in a value that isn't a schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#/const/type", "const": { "type": "string" } }`);
    expect(reasons(file)).toEqual([expect.stringContaining("isn't a schema")]);
  });

  test("a location in a keyword that isn't one in the dialect", async () => {
    const file = await lint(`{
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      "$ref": "#/definitions/foo",
      "definitions": { "foo": { "type": "string" } }
    }`);
    expect(reasons(file)).toEqual([expect.stringContaining("isn't a schema")]);
  });

  test("something that isn't a schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#/$defs", "$defs": { "foo": true } }`);
    expect(reasons(file)).toEqual([expect.stringContaining("isn't a schema")]);
  });

  test("a file that finds a schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "other.schema.json#/$defs/foo" }`);
    expect(file.messages).to.eql([]);
  });

  test("a file that doesn't exist", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "missing.schema.json" }`);
    expect(reasons(file)).to.eql([`The reference doesn't find a schema. '${fromWorkingDirectory("missing.schema.json")}' doesn't exist`]);
  });

  test("a JSON Pointer into another file that finds nothing", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "other.schema.json#/$defs/bar" }`);
    expect(reasons(file)).toEqual([expect.stringContaining("Property 'bar' doesn't exist")]);
  });

  test("a file that isn't a schema", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "plain.json" }`);
    expect(reasons(file)).toEqual([expect.stringContaining("isn't a schema")]);
  });

  test("a schema with problems of its own isn't reported", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "invalid.schema.json" }`);
    expect(file.messages).to.eql([]);
  });

  test("a URL that can't be retrieved isn't reported", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "https://example.com/schema" }`);
    expect(file.messages).to.eql([]);
  });

  test("references in subschemas", async () => {
    const file = await lint(`{ "$schema": "${v1}", "properties": { "foo": { "$ref": "#/$defs/bar" } }, "$defs": {} }`);
    expect(reasons(file)).toEqual([expect.stringContaining("Property 'bar' doesn't exist")]);
  });

  test("a reference in draft-07", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "properties": { "foo": { "$ref": "#/definitions/bar" } }, "definitions": {} }`);
    expect(reasons(file)).toEqual([expect.stringContaining("Property 'bar' doesn't exist")]);
  });

  test("a reference in draft-07 that finds a schema", async () => {
    const file = await lint(`{ "$schema": "${draft07}", "properties": { "foo": { "$ref": "#/definitions/bar" } }, "definitions": { "bar": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("it can be turned off with a configuration comment", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$comment": "json-schema-lint-disable reference-without-target", "$ref": "#/$defs/bar" }`);
    expect(file.messages).to.eql([]);
  });
});
