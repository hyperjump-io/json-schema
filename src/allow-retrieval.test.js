import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { describe, test, beforeAll, afterAll, expect } from "vitest";
import { RetrievalError } from "@hyperjump/browser";
import { JsonSchema, RetrievalNotAllowedError } from "./json-schema.js";
import { addV1, v1DialectUri } from "./dialects/v1/index.js";
import { SchemaRegistry } from "./registry/schema-registry.js";

/**
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
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
      $ref: pathToFileURL(join(outside, "outside.schema.json")).href
    }));
  });

  afterAll(async () => {
    await rm(inside, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  });

  test("by default, a schema in the working directory can be compiled", async () => {
    const validator = await v1().compile(pathToFileURL(join(inside, "inside.schema.json")).href);
    expect(validator.validate("foo")).to.equal(true);
  });

  test("by default, a schema outside the working directory is refused", async () => {
    const uri = pathToFileURL(join(outside, "outside.schema.json")).href;
    const error = await v1().compile(uri)
      .catch((/** @type unknown */ error) => error);
    expect(error).to.be.instanceOf(RetrievalNotAllowedError);
    expect(error).not.to.be.instanceOf(RetrievalError);
    expect(/** @type RetrievalNotAllowedError */ (error).uri).to.equal(uri);
  });

  test("a reference is refused", async () => {
    const uri = pathToFileURL(join(inside, "refers-outside.schema.json")).href;
    await expect(v1().compile(uri)).rejects.toThrow(RetrievalNotAllowedError);
  });

  test("the config replaces the default", async () => {
    const jsonSchema = v1({ allowRetrieval: [pathToFileURL(join(outside, "/")).href] });
    const validator = await jsonSchema.compile(pathToFileURL(join(outside, "outside.schema.json")).href);
    expect(validator.validate("foo")).to.equal(true);
  });

  test("a session's list is used instead of the config's", async () => {
    const session = v1({ allowRetrieval: [] }).session({ allowRetrieval: ["./", pathToFileURL(join(outside, "/")).href] });
    const validator = await session.compile(pathToFileURL(join(inside, "refers-outside.schema.json")).href);
    expect(validator.validate("foo")).to.equal(true);
  });

  test("registries aren't checked", async () => {
    const jsonSchema = v1({ allowRetrieval: [] });
    const registry = new SchemaRegistry().with(schema, { retrievalUri: "https://example.com/schema" });
    const validator = await jsonSchema.compile("https://example.com/schema", { registries: [registry] });
    expect(validator.validate("foo")).to.equal(true);
  });
});

/** @type (config?: JsonSchemaConfig) => JsonSchema */
const v1 = (config) => {
  const jsonSchema = new JsonSchema(config);
  addV1(jsonSchema);
  return jsonSchema;
};
