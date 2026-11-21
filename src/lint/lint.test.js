import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { jsonSchemaConfig } from "../json-schema.js";
import { SchemaRegistry } from "../registry/schema-registry.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import recommended from "./recommended.js";
import thenElseWithoutIf from "./rules/then-else-without-if.js";
import referenceWithoutTarget from "./rules/reference-without-target.js";
import { lint } from "../operations/lint.js";

/**
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

const a = `{
  "$schema": "${v1DialectUri}",
  "$id": "https://example.com/a",
  "then": { "type": "string" }
}`;

describe("lint", () => {
  test("results are plain data", async () => {
    expect(await lint(jsonSchemaWith(a), "https://example.com/a", { plugins: [thenElseWithoutIf] })).to.eql([{
      source: "json-schema-lint",
      ruleId: "then-else-without-if",
      severity: "warn",
      uri: "https://example.com/a",
      place: { start: { line: 4, column: 3, offset: 81 }, end: { line: 4, column: 31, offset: 109 } },
      message: "'then' has no effect without 'if'",
      url: "https://hyperjump.io/json-schema/linting/rules/then-else-without-if/"
    }]);
  });

  test("the recommended preset by default", async () => {
    const results = await lint(jsonSchemaWith(a), "https://example.com/a");

    expect(results.map((result) => result.ruleId)).to.eql(["then-else-without-if"]);
  });

  test("a preset with a rule adjusted after it", async () => {
    const results = await lint(jsonSchemaWith(a), "https://example.com/a", {
      plugins: [recommended, [thenElseWithoutIf, ["error"]]]
    });

    expect(results.map((result) => [result.ruleId, result.severity])).to.eql([["then-else-without-if", "error"]]);
  });

  test("a rule that's off", async () => {
    const results = await lint(jsonSchemaWith(a), "https://example.com/a", {
      plugins: [recommended, [thenElseWithoutIf, ["off"]]]
    });

    expect(results).to.eql([]);
  });

  test("the whole document, including definitions nothing references", async () => {
    const results = await lint(jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "$defs": { "unused": { "then": { "type": "string" } } }
    }`), "https://example.com/main", { plugins: [thenElseWithoutIf] });

    expect(results).to.have.length(1);
  });

  test("the whole document, whatever the fragment", async () => {
    const results = await lint(jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "then": { "type": "string" },
      "$defs": { "foo": { "else": true } }
    }`), "https://example.com/main#/$defs/foo", { plugins: [thenElseWithoutIf] });

    expect(results).to.have.length(2);
  });

  test("a document it references isn't linted, but rules can see it", async () => {
    const results = await lint(jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "properties": {
        "foo": { "$ref": "other" },
        "bar": { "$ref": "other#/$defs/missing" }
      }
    }`, `{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/other",
      "then": { "type": "string" }
    }`), "https://example.com/main", { plugins: [thenElseWithoutIf, referenceWithoutTarget] });

    expect(results.map((result) => [result.uri, result.ruleId])).to.eql([
      ["https://example.com/main", "reference-without-target"]
    ]);
  });

  test("configuration comments apply", async () => {
    const results = await lint(jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/main",
      "$comment": "json-schema-lint-disable then-else-without-if",
      "then": { "type": "string" }
    }`), "https://example.com/main", { plugins: [thenElseWithoutIf] });

    expect(results).to.eql([]);
  });

  test("a document's schema problems are returned, not thrown", async () => {
    const results = await lint(jsonSchemaWith(`{
      "$schema": "${v1DialectUri}",
      "$id": "https://example.com/bad",
      "minLength": -1
    }`), "https://example.com/bad");

    expect(results).toMatchObject([{
      source: "json-schema",
      ruleId: "https://json-schema.org/keyword/minLength",
      severity: "error",
      uri: "https://example.com/bad"
    }]);
  });

  describe("files", () => {
    /** @type string */
    let directory;

    beforeAll(async () => {
      directory = await mkdtemp(join(tmpdir(), "json-schema-"));
    });

    afterAll(async () => {
      await rm(directory, { recursive: true });
    });

    test("a document that isn't a schema", async () => {
      const path = join(directory, "instance.json");
      await writeFile(path, "{}");
      const jsonSchema = jsonSchemaConfig({
        allowRetrieval: [pathToFileURL(join(directory, "/")).href]
      });

      await expect(lint(jsonSchema, pathToFileURL(path).href)).rejects.toMatchObject({
        message: expect.stringContaining("isn't a schema"),
        cause: { code: "ERR_NOT_A_SCHEMA" }
      });
    });
  });
});

/** @type (...schemas: string[]) => JsonSchemaConfig */
const jsonSchemaWith = (...schemas) => {
  return jsonSchemaConfig({
    dialects: [v1Dialect],
    registry: new SchemaRegistry(schemas.map((schema) => ({ schema })))
  });
};
