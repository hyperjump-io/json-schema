import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { normalizeIri, toRelativeIri, urlToIri } from "@hyperjump/uri";
import { toId } from "./identifiers.js";
import { configureJsonSchema } from "./json-schema.js";
import { v1Dialect, v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";
import { compile } from "./operations/compile.js";
import { validatorFor } from "./operations/validate-compiled.js";

/**
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 * @import { JsonSchema } from "./json-schema.d.ts"
 */

const schema = JSON.stringify({ $schema: v1DialectUri, type: "string" });

// browser's `allowRetrieval` tests cover matching. These are what schemas
// add: compiling, references, and registries.
describe("allowRetrieval", () => {
  /** A directory in the working directory, which the default allows */
  let inside = "";

  /** A directory outside the working directory, which the default refuses */
  let outside = "";

  beforeAll(async () => {
    inside = await mkdtemp(join(cwd(), ".allow-retrieval-test-"));
    outside = await mkdtemp(join(tmpdir(), "json-schema-"));
    await writeFile(join(inside, "inside.schema.json"), schema);
    await writeFile(join(outside, "outside.schema.json"), schema);
    await writeFile(join(inside, "refers-outside.schema.json"), JSON.stringify({
      $schema: v1DialectUri,
      $ref: toRelativeIri(normalizeIri(urlToIri(pathToFileURL(join(outside, "outside.schema.json")))), toId(urlToIri(pathToFileURL(join(inside, "refers-outside.schema.json")))))
    }));
  });

  afterAll(async () => {
    await rm(inside, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  test("by default, a schema in the working directory can be compiled", async () => {
    const compiled = await compile(v1(), pathToFileURL(join(inside, "inside.schema.json")).href);
    expect(validatorFor(compiled)("foo")).to.equal(true);
  });

  test("by default, a schema outside the working directory is refused", async () => {
    const uri = pathToFileURL(join(outside, "outside.schema.json")).href;
    const error = await compile(v1(), uri)
      .catch((/** @type unknown */ error) => error);
    expect(error).toMatchObject({ cause: { code: "ERR_RETRIEVAL_NOT_ALLOWED" }, url: uri });
  });

  test("a reference is refused", async () => {
    const uri = pathToFileURL(join(inside, "refers-outside.schema.json")).href;
    await expect(compile(v1(), uri)).rejects.toMatchObject({ cause: { code: "ERR_RETRIEVAL_NOT_ALLOWED" } });
  });

  test("the config replaces the default", async () => {
    const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(outside, "/")).href] });
    const compiled = await compile(jsonSchema, pathToFileURL(join(outside, "outside.schema.json")).href);
    expect(validatorFor(compiled)("foo")).to.equal(true);
  });

  test("a call's list is used instead of the config's", async () => {
    const compiled = await compile(v1({ allowRetrieval: [] }), pathToFileURL(join(inside, "refers-outside.schema.json")).href, {
      allowRetrieval: ["./", pathToFileURL(join(outside, "/")).href]
    });
    expect(validatorFor(compiled)("foo")).to.equal(true);
  });

  test("registries aren't checked", async () => {
    const jsonSchema = v1({ allowRetrieval: [] });
    const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/schema" });
    const compiled = await compile(jsonSchema, "https://example.com/schema", { registry });
    expect(validatorFor(compiled)("foo")).to.equal(true);
  });
});

/** @type (config?: JsonSchemaConfig) => JsonSchema */
const v1 = (config) => {
  const jsonSchema = configureJsonSchema({ dialects: [v1Dialect], ...config });
  return jsonSchema;
};
