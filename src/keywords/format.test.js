import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { JsonSchema } from "../json-schema.js";
import { addV1, v1DialectUri } from "../dialects/v1/index.js";
import { addFullFormats } from "../formats/full.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 */

describe("format", () => {
  /** @type string */
  let directory;
  let fileCount = 0;

  /** @type (schema: Record<string, Json>) => Promise<string> */
  const schemaFile = async (schema) => {
    const path = join(directory, `${fileCount++}.schema.json`);
    await writeFile(path, JSON.stringify({ $schema: v1DialectUri, ...schema }));
    return pathToFileURL(path).toString();
  };

  /** @type (config?: JsonSchemaConfig) => JsonSchema */
  const v1 = (config) => {
    const jsonSchema = new JsonSchema(config);
    addV1(jsonSchema);
    return jsonSchema;
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-next-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("v1 validates formats by default", async () => {
    const validator = await v1().compile(await schemaFile({ format: "date" }));

    expect(validator.validate("2026-10-17")).to.equal(true);
    expect(validator.validate("not a date")).to.equal(false);
    expect(validator.validate(42)).to.equal(true);
  });

  test("a format that isn't supported is an error", async () => {
    await expect(v1().compile(await schemaFile({ format: "nope" }))).rejects.toThrow("'nope' format isn't supported");
  });

  test("the lite formats don't include the formats that need Unicode data", async () => {
    await expect(v1().compile(await schemaFile({ format: "idn-hostname" }))).rejects.toThrow("addFormat");
  });

  test("the full formats", async () => {
    const jsonSchema = v1();
    addFullFormats(jsonSchema);
    const validator = await jsonSchema.compile(await schemaFile({ format: "idn-hostname" }));

    expect(validator.validate("例え.テスト")).to.equal(true);
    expect(validator.validate("-invalid-")).to.equal(false);
  });

  test("validateFormats overrides the dialect", async () => {
    const validator = await v1({ validateFormats: false }).compile(await schemaFile({ format: "date" }));

    expect(validator.validate("not a date")).to.equal(true);
  });

  test("any format is allowed if formats aren't validated", async () => {
    const validator = await v1({ validateFormats: false }).compile(await schemaFile({ format: "nope" }));

    expect(validator.validate("foo")).to.equal(true);
  });

  test("format is an annotation", async () => {
    for (const validateFormats of [true, false]) {
      const validator = await v1({ validateFormats }).compile(await schemaFile({ format: "date" }));

      const { node } = validator.annotate("2026-10-17");
      expect(node.data?.annotations?.get("https://json-schema.org/keyword/format")).to.eql(["date"]);
    }
  });

  test("a format added to a dialect", async () => {
    const jsonSchema = v1();
    jsonSchema.addFormat({ uri: "https://example.com/format/even", validate: (value) => typeof value !== "number" || value % 2 === 0 });
    jsonSchema.extendDialect(v1DialectUri, { formats: { even: "https://example.com/format/even" } });
    const validator = await jsonSchema.compile(await schemaFile({ format: "even" }));

    expect(validator.validate(2)).to.equal(true);
    expect(validator.validate(3)).to.equal(false);
  });
});
