import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { jsonSchemaMediaTypes } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { draft04Dialect, draft04DialectUri } from "../dialects/draft-04/index.js";
import { draft06Dialect, draft06DialectUri } from "../dialects/draft-06/index.js";
import { draft07Dialect, draft07DialectUri } from "../dialects/draft-07/index.js";
import { draft201909Dialect, draft201909DialectUri } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect, draft202012DialectUri } from "../dialects/draft-2020-12/index.js";
import { compile } from "../operations/compile.js";
import { validatorFor } from "../operations/validate-compiled.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { EvaluationPlugin } from "../kernel/evaluation-plugin.d.ts"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

/**
 * Before v1, patterns are compiled with the `u` flag, or without it if
 * they're only valid without it (`patternRegExp`), on plain values, JSON
 * text, and with plugins. v1's need the flag.
 */
describe("patterns that are only valid without the u flag", () => {
  /** @type JsonSchemaConfig */
  let jsonSchema;

  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: draft202012DialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  /** @type EvaluationPlugin */
  const plugin = {};

  /** @type (compiled: Awaited<ReturnType<typeof compile>>, instance: Json, expected: boolean) => void */
  const expectValid = (compiled, instance, expected) => {
    expect(validatorFor(compiled)(instance)).to.equal(expected);
    expect(validatorFor(compiled, { input: "json" })(JSON.stringify(instance))).to.equal(expected);
    expect(validatorFor(compiled, { plugins: [plugin] })(instance)).to.equal(expected);
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    jsonSchema = {
      mediaTypes: jsonSchemaMediaTypes({ dialects: [draft202012Dialect, draft201909Dialect, draft07Dialect, draft06Dialect, draft04Dialect, v1Dialect] }),
      allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href]
    };
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("pattern", async () => {
    // krakend's endpoints
    const compiled = await compile(jsonSchema, await schemaFile({ pattern: "^\\/[^\\*\\?\\&\\%]*(\\/\\*)?$" }));

    expectValid(compiled, "/users/*", true);
    expectValid(compiled, "/users?id=1", false);
    expectValid(compiled, "/a&b", false);
    expectValid(compiled, 42, true);
  });

  test("patternProperties, and additionalProperties beside it", async () => {
    const compiled = await compile(jsonSchema, await schemaFile({
      patternProperties: { "^\\%": { type: "number" } },
      additionalProperties: { type: "string" }
    }));

    expectValid(compiled, { "%a": 1, "b": "x" }, true);
    expectValid(compiled, { "%a": "x" }, false);
    expectValid(compiled, { b: 1 }, false);
  });

  test("propertyNames", async () => {
    const compiled = await compile(jsonSchema, await schemaFile({ propertyNames: { pattern: "^[^\\&]+$" } }));

    expectValid(compiled, { ab: 1 }, true);
    expectValid(compiled, { "a&b": 1 }, false);
  });

  test("every dialect before v1", async () => {
    for (const dialectUri of [draft04DialectUri, draft06DialectUri, draft07DialectUri, draft201909DialectUri]) {
      const compiled = await compile(jsonSchema, await schemaFile({
        $schema: dialectUri,
        pattern: "^[^\\&]*$",
        patternProperties: { "^\\%": { type: "number" } },
        additionalProperties: { type: "string" }
      }));

      expectValid(compiled, "a&b", false);
      expectValid(compiled, { "%a": 1, "b": "x" }, true);
      expectValid(compiled, { "%a": "x" }, false);
    }
  });

  test("not in v1, which needs the u flag", async () => {
    for (const schema of /** @type Record<string, Json>[] */ ([{ pattern: "^\\&" }, { patternProperties: { "^\\%": {} } }])) {
      await expect(compile(jsonSchema, await schemaFile({ $schema: v1DialectUri, ...schema }))).rejects.toThrow("Expected a regular expression");
    }
  });
});
