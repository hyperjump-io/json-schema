import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect } from "../dialects/v1/index.js";
import { jsonSchemaValidate } from "./validate.js";
import { compile } from "../operations/compile.js";

/**
 * @import { JsonParseStatus } from "@hyperjump/browser"
 * @import { CompiledSchema } from "../operations/compile.d.ts"
 */

const schemaUri = "https://example.com/person";

describe("jsonSchemaValidate", () => {
  /** @type CompiledSchema */
  let compiled;

  beforeAll(async () => {
    const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });
    const registry = new SchemaRegistry([{
      schema: {
        $schema: "https://json-schema.org/v1",
        $id: schemaUri,
        type: "object",
        properties: {
          age: { type: "integer", minimum: 0 }
        },
        required: ["name"]
      }
    }]);
    compiled = await compile(jsonSchema, schemaUri, { registry });
  });

  /** @type (json: string, accept?: JsonParseStatus) => Promise<VFile> */
  const validate = async (json, accept = "recovered") => {
    const file = new VFile({ path: "/data/person.json", value: json });
    await unified()
      .use(rejsonParse, { accept })
      .use(jsonSchemaValidate, { compiled })
      .use(rejsonStringify)
      .process(file);
    return file;
  };

  test("a valid document has no messages", async () => {
    const file = await validate(`{ "name": "a", "age": 1 }`);
    expect(file.messages).to.eql([]);
  });

  test("validation errors are fatal messages at the failing value", async () => {
    const file = await validate(`{ "name": "a", "age": -1 }`);
    expect(file.messages.map(({ ruleId, source, fatal, line, column }) => ({ ruleId, source, fatal, line, column }))).to.eql([
      { ruleId: "https://json-schema.org/keyword/minimum", source: "json-schema", fatal: true, line: 1, column: 23 }
    ]);
    expect(file.messages[0].reason).to.equal(`Fails the constraint at '${schemaUri}#/properties/age/minimum'`);
  });

  test("every error is reported", async () => {
    const file = await validate(`{ "age": "a" }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql([
      "https://json-schema.org/keyword/required",
      "https://json-schema.org/keyword/type"
    ]);
  });

  test("a document with a syntax error is validated as far as it could be parsed", async () => {
    const file = await validate(`{ "name": "a", "age": -1, }`);
    expect(file.messages.map((message) => message.ruleId)).to.eql([
      "trailing-comma",
      "https://json-schema.org/keyword/minimum"
    ]);
  });

  test("a value that couldn't be parsed doesn't fail the schema", async () => {
    const file = await validate(`{ "name": "a", "age": }`, "failure");
    expect(file.messages.map((message) => message.source)).to.not.include("json-schema");
  });

  test("an empty document only has the syntax error", async () => {
    const file = await validate("", "failure");
    expect(file.messages.map((message) => message.source)).to.eql(["json"]);
  });

  // A file's location would reveal where the schemas are on the machine
  describe("a schema in a file", () => {
    /** @type string */
    let directory;

    /** @type CompiledSchema */
    let fileValidator;

    beforeAll(async () => {
      directory = await mkdtemp(join(cwd(), ".validate-test-"));
      const path = join(directory, "person.schema.json");
      await writeFile(path, JSON.stringify({ $schema: "https://json-schema.org/v1", properties: { age: { minimum: 0 } } }));
      const jsonSchema = new JsonSchema({ dialects: [v1Dialect] });
      fileValidator = await compile(jsonSchema, pathToFileURL(path).href);
    });

    afterAll(async () => {
      await rm(directory, { recursive: true, force: true });
    });

    test("is said relative to the working directory", async () => {
      const file = new VFile({ path: join(directory, "data", "person.json"), value: `{ "age": -1 }` });
      await unified()
        .use(rejsonParse)
        .use(jsonSchemaValidate, { compiled: fileValidator })
        .use(rejsonStringify)
        .process(file);

      const schemaPath = relative(cwd(), join(directory, "person.schema.json"));
      expect(file.messages.map((message) => message.reason)).to.eql([`Fails the constraint at '${schemaPath}#/properties/age/minimum'`]);
    });
  });
});
