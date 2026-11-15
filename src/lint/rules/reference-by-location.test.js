import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { cwd } from "node:process";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser";
import { jsonSchemaMediaTypes } from "../../json-schema.js";
import { JsonSchemaHyperjump } from "../../session.js";
import { SchemaRegistry } from "../../registry/schema-registry.js";
import { jsonSchemaResolve } from "../../schema/resolve.js";
import { v1Dialect } from "../../dialects/v1/index.js";
import { draft07Dialect } from "../../dialects/draft-07/index.js";
import referenceByLocation from "./reference-by-location.js";

const v1 = "https://json-schema.org/v1";
const draft07 = "http://json-schema.org/draft-07/schema#";

const common = JSON.stringify({ $schema: v1, $id: "https://example.com/common", $defs: { foo: { type: "string" } } });

describe("reference-by-location", () => {
  /** A directory in the working directory, which can be retrieved from */
  let directory = "";

  beforeAll(async () => {
    directory = await mkdtemp(join(cwd(), ".reference-by-location-test-"));
    await writeFile(join(directory, "common.schema.json"), common);
    await writeFile(join(directory, "plain.schema.json"), JSON.stringify({ $schema: v1, $defs: { foo: { type: "string" } } }));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true, force: true });
  });

  /**
   * Lint a file in the directory. Like the CLI, the session has the schemas
   * with an `$id` in a registry, unless `registry` says otherwise.
   *
   * @type (json: string, registry?: SchemaRegistry) => Promise<VFile>
   */
  const lint = async (json, registry = new SchemaRegistry([{ schema: common, origin: join(directory, "common.schema.json") }])) => {
    const jsonSchema = { mediaTypes: jsonSchemaMediaTypes({ dialects: [v1Dialect, draft07Dialect] }) };
    const file = new VFile({ path: join(directory, "a.schema.json"), value: json });
    const processor = unified()
      .use(rejsonParse)
      .use(jsonSchemaResolve, { session: new JsonSchemaHyperjump({ ...jsonSchema, registry }) })
      .use(referenceByLocation);
    await processor.run(processor.parse(file), file);
    return file;
  };

  /** @type (file: VFile) => string[] */
  const reasons = (file) => file.messages.map((message) => message.reason);

  test("a file whose schema has an $id", async () => {
    const json = `{ "$schema": "${v1}", "$ref": "common.schema.json" }`;
    const file = await lint(json);
    expect(reasons(file)).to.eql(["The reference finds the schema by where it is, not by its identifier, 'https://example.com/common'"]);
    const offset = json.indexOf(`"common.schema.json"`);
    expect(file.messages[0]).toMatchObject({
      ruleId: "reference-by-location",
      source: "json-schema-lint",
      fatal: false,
      place: { start: { line: 1, column: offset + 1 }, end: { line: 1, column: offset + 1 + `"common.schema.json"`.length } }
    });
  });

  test("a JSON Pointer into a file whose schema has an $id", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "common.schema.json#/$defs/foo" }`);
    expect(reasons(file)).to.eql(["The reference finds the schema by where it is, not by its identifier, 'https://example.com/common#/$defs/foo'"]);
  });

  test("the schema's identifier", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "https://example.com/common#/$defs/foo" }`);
    expect(file.messages).to.eql([]);
  });

  test("a file whose schema has an $id that doesn't find it isn't reported", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "common.schema.json" }`, new SchemaRegistry());
    expect(file.messages).to.eql([]);
  });

  test("a file whose schema doesn't have an $id", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "plain.schema.json#/$defs/foo" }`);
    expect(file.messages).to.eql([]);
  });

  test("a JSON Pointer into an embedded resource", async () => {
    const file = await lint(`{
      "$schema": "${v1}",
      "$ref": "#/$defs/embedded/$defs/foo",
      "$defs": {
        "embedded": { "$id": "https://example.com/embedded", "$defs": { "foo": true } }
      }
    }`);
    expect(reasons(file)).to.eql(["The reference finds the schema by where it is, not by its identifier, 'https://example.com/embedded#/$defs/foo'"]);
  });

  test("an embedded resource by its identifier", async () => {
    const file = await lint(`{
      "$schema": "${v1}",
      "$ref": "https://example.com/embedded#/$defs/foo",
      "$defs": {
        "embedded": { "$id": "https://example.com/embedded", "$defs": { "foo": true } }
      }
    }`);
    expect(file.messages).to.eql([]);
  });

  test("a JSON Pointer into the same resource", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#/$defs/foo", "$defs": { "foo": true } }`);
    expect(file.messages).to.eql([]);
  });

  test("an anchor", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "#foo", "$defs": { "foo": { "$anchor": "foo" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("a reference that doesn't find a schema isn't reported", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$ref": "missing.schema.json" }`);
    expect(file.messages).to.eql([]);
  });

  test("a reference in draft-07", async () => {
    const file = await lint(`{
      "$schema": "${draft07}",
      "properties": { "foo": { "$ref": "#/definitions/embedded" } },
      "definitions": { "embedded": { "$id": "https://example.com/embedded" } }
    }`);
    expect(reasons(file)).to.eql(["The reference finds the schema by where it is, not by its identifier, 'https://example.com/embedded'"]);
  });

  test("a property named $ref", async () => {
    const file = await lint(`{ "$schema": "${v1}", "properties": { "$ref": { "const": "common.schema.json" } } }`);
    expect(file.messages).to.eql([]);
  });

  test("it can be turned off with a configuration comment", async () => {
    const file = await lint(`{ "$schema": "${v1}", "$comment": "json-schema-lint-disable reference-by-location", "$ref": "common.schema.json" }`);
    expect(file.messages).to.eql([]);
  });
});
