import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { configureJsonSchema, extendDialect } from "../json-schema.js";
import { v1Dialect, v1DialectUri } from "../dialects/v1/index.js";
import { fullFormats } from "../formats/full.js";
import { compile } from "../operations/compile.js";
import { annotatorFor, validatorFor } from "../operations/validate-compiled.js";

/**
 * @import { Json, ReadonlyJson } from "@hyperjump/browser"
 * @import { JsonSchemaConfig } from "../json-schema.d.ts"
 * @import { Format } from "../format.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
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
    const jsonSchema = configureJsonSchema({ allowRetrieval: [pathToFileURL(join(tmpdir(), "/")).href], dialects: [v1Dialect], ...config });
    return jsonSchema;
  };

  beforeAll(async () => {
    directory = await mkdtemp(join(tmpdir(), "json-schema-"));
  });

  afterAll(async () => {
    await rm(directory, { recursive: true });
  });

  test("v1 validates formats by default", async () => {
    const compiled = await compile(v1(), await schemaFile({ format: "date" }));

    expect(validatorFor(compiled)("2026-10-17")).to.equal(true);
    expect(validatorFor(compiled)("not a date")).to.equal(false);
    expect(validatorFor(compiled)(42)).to.equal(true);
  });

  test("the regex format is a pattern with the u flag, unlike pattern", async () => {
    const compiled = await compile(v1(), await schemaFile({ format: "regex" }));

    expect(validatorFor(compiled)("^\\p{L}$")).to.equal(true);
    expect(validatorFor(compiled)("^\\&$")).to.equal(false);
  });

  test("a format that isn't supported is an error", async () => {
    await expect(compile(v1(), await schemaFile({ format: "nope" }))).rejects.toThrow("'nope' format isn't supported");
  });

  test("the lite formats don't include the formats that need Unicode data", async () => {
    await expect(compile(v1(), await schemaFile({ format: "idn-hostname" }))).rejects.toThrow("'formats' config");
  });

  test("the full formats", async () => {
    const jsonSchema = v1({ formats: fullFormats });
    const compiled = await compile(jsonSchema, await schemaFile({ format: "idn-hostname" }));

    expect(validatorFor(compiled)("例え.テスト")).to.equal(true);
    expect(validatorFor(compiled)("-invalid-")).to.equal(false);
  });

  test("validateFormats overrides the dialect", async () => {
    const compiled = await compile(v1({ validateFormats: false }), await schemaFile({ format: "date" }));

    expect(validatorFor(compiled)("not a date")).to.equal(true);
  });

  test("any format is allowed if formats aren't validated", async () => {
    const compiled = await compile(v1({ validateFormats: false }), await schemaFile({ format: "nope" }));

    expect(validatorFor(compiled)("foo")).to.equal(true);
  });

  test("format is an annotation", async () => {
    for (const validateFormats of [true, false]) {
      const compiled = await compile(v1({ validateFormats }), await schemaFile({ format: "date" }));

      const { node } = annotatorFor(compiled)("2026-10-17");
      expect(node.data?.annotations?.get("https://json-schema.org/keyword/format")).to.eql(["date"]);
    }
  });

  test("a format added to a dialect", async () => {
    /** @type Format */
    const even = { uri: "https://example.com/format/even", types: ["number"], validate: (value) => /** @type number */ (value) % 2 === 0 };
    const jsonSchema = v1({ dialects: [extendDialect(v1Dialect, { formats: { even } })] });
    const compiled = await compile(jsonSchema, await schemaFile({ format: "even" }));

    expect(validatorFor(compiled)(2)).to.equal(true);
    expect(validatorFor(compiled)(3)).to.equal(false);
  });

  test("a value of a type the format doesn't apply to is valid without calling validate", async () => {
    /** @type ReadonlyJson[] */
    const validated = [];
    /** @type Format */
    const never = {
      uri: "https://example.com/format/never",
      types: ["string", "array"],
      validate: (value) => {
        validated.push(value);
        return false;
      }
    };
    const jsonSchema = v1({ dialects: [extendDialect(v1Dialect, { formats: { never } })] });
    const compiled = await compile(jsonSchema, await schemaFile({ format: "never" }));

    expect(validatorFor(compiled)("foo")).to.equal(false);
    expect(validatorFor(compiled)([1])).to.equal(false);
    expect(validatorFor(compiled)(42)).to.equal(true);
    expect(validatorFor(compiled)({ a: 1 })).to.equal(true);
    expect(validatorFor(compiled)(null)).to.equal(true);
    expect(validated).to.eql(["foo", [1]]);
  });

  test("a format without types applies to every type", async () => {
    const never = { uri: "https://example.com/format/never", validate: () => false };
    const jsonSchema = v1({ dialects: [extendDialect(v1Dialect, { formats: { never } })] });
    const compiled = await compile(jsonSchema, await schemaFile({ format: "never" }));

    for (const value of ["foo", 42, true, null, [], {}]) {
      expect(validatorFor(compiled)(value)).to.equal(false);
    }
  });

  test("a value of a type the format doesn't apply to is annotated", async () => {
    const { node } = annotatorFor(await compile(v1(), await schemaFile({ format: "date" })))(42);
    expect(node.data?.annotations?.get("https://json-schema.org/keyword/format")).to.eql(["date"]);
  });
});
