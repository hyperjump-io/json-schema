import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { BASIC } from "../output/index.js";
import { compile } from "../operations/compile.js";
import { validatorFor } from "../operations/validate.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 */

/**
 * The JSON-Schema-Test-Suite only has well-formed instances. These are for
 * instances with syntax errors, where a value that couldn't be parsed
 * shouldn't cause errors of its own.
 */
describe("validation keywords with syntax errors", () => {
  /** @type JsonSchema */
  let jsonSchema;

  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: v1DialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    jsonSchema = new JsonSchema({ allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href], dialects: [v1Dialect] });
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  /** @type [string, Record<string, Json>, string, string[]][] */
  const cases = [
    ["const with a missing property value", { const: { a: 1, b: 2 } }, `{ "a": , "b": 2 }`, ["value-expected"]],
    ["const with a missing item", { const: [1, 2] }, `[, 2]`, ["value-expected"]],
    ["enum with a missing property value", { enum: [{ a: 1 }] }, `{ "a": }`, ["value-expected"]],
    ["uniqueItems with a missing property value", { uniqueItems: true }, `[{ "a": }, { "a": 1 }]`, ["value-expected"]],
    ["uniqueItems with a missing extra property value", { uniqueItems: true }, `[{ "a": 1 }, { "a": 1, "b": }]`, ["value-expected"]],
    ["uniqueItems with missing items", { uniqueItems: true }, `[1, , , 2]`, ["value-expected", "value-expected"]],
    [
      "uniqueItems still finds duplicates that were parsed",
      { uniqueItems: true },
      `[1, @, 1]`,
      ["https://json-schema.org/keyword/uniqueItems", "invalid-literal"]
    ],
    ["required with a missing property value", { required: ["a"] }, `{ "a": }`, ["value-expected"]],
    ["dependentRequired with a missing property value", { dependentRequired: { a: ["b"] } }, `{ "a": 1, "b": }`, ["value-expected"]]
  ];

  for (const [description, schema, json, ruleIds] of cases) {
    test(description, async () => {
      const compiled = await compile(jsonSchema, await schemaFile(schema));

      const result = validatorFor(compiled, { input: "json", output: BASIC })(json);
      expect(result.errors.map((error) => error.ruleId)).to.eql(ruleIds);
    });
  }
});
