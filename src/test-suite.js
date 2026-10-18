import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchema } from "./json-schema.js";
import { SchemaRegistry } from "./schema-registry.js";
import { addFullFormats } from "./formats/full.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { JsonSchemaConfig, Validator } from "./json-schema.d.ts"
 */

// Shared by the JSON-Schema-Test-Suite runners

/**
 * Whether a test case's `compatibility` includes a release. Releases are
 * numbered by year, except v1, which is in the spec but not released, so the
 * suite calls it 9999. This is the algorithm from the suite's README.
 *
 * @type (compatibility: string | undefined, version: number) => boolean
 */
export const isCompatible = (compatibility, version) => {
  if (compatibility === undefined) {
    return true;
  }

  let isValid = true;
  for (const constraint of compatibility.split(",")) {
    const [, operator, constraintVersion] = /** @type RegExpExecArray */ (/^(<=|=)?(\d+)$/.exec(constraint));
    const releaseVersion = Number(constraintVersion);

    if (operator === "<=") {
      isValid = version <= releaseVersion;
    } else if (operator === "=") {
      isValid = version === releaseVersion;
    } else {
      isValid = version >= releaseVersion;
    }

    if (version <= releaseVersion) {
      break;
    }
  }

  return isValid;
};

/**
 * Whether a test file, test case, or test is skipped. Skipped paths are
 * `|file|test case|test`, and a prefix skips everything under it.
 *
 * @type (skip: Set<string>, path: string[]) => boolean
 */
export const isSkipped = (skip, path) => {
  let key = "";
  for (const segment of path) {
    key = `${key}|${segment}`;
    if (skip.has(key)) {
      return true;
    }
  }
  return false;
};

/**
 * A JsonSchema for running test cases. Every test case's schemas are in a
 * session registry, so nothing is retrieved. The suite's URIs aren't real,
 * so `http(s):` is removed to make sure of that.
 *
 * @type (config?: JsonSchemaConfig) => JsonSchema
 */
export const testSuiteJsonSchema = (config) => {
  const jsonSchema = new JsonSchema(config);
  addFullFormats(jsonSchema);
  jsonSchema.removeUriSchemePlugin("http");
  jsonSchema.removeUriSchemePlugin("https");

  return jsonSchema;
};

/**
 * Compile a test case's schema. External schema URIs aren't unique across
 * test cases, so each test case has its own registry. The suite's schemas
 * don't have `$schema`, so the dialect under test is given for them.
 *
 * @type (jsonSchema: JsonSchema, dialectUri: string, uri: string, schema: Json, externalSchemas?: Record<string, Json>) => Promise<Validator>
 */
export const compileTestCase = async (jsonSchema, dialectUri, uri, schema, externalSchemas = {}) => {
  const registry = new SchemaRegistry();
  for (const externalUri in externalSchemas) {
    registry.add(externalSchemas[externalUri], { retrievalUri: externalUri, dialectUri });
  }
  registry.add(schema, { retrievalUri: uri, dialectUri });

  // A schema is identified by its `$id`, which is relative to the URI it was
  // retrieved from
  const id = typeof schema === "object" && schema !== null && !Array.isArray(schema) && typeof schema.$id === "string"
    ? toAbsoluteIri(resolveIri(schema.$id, uri))
    : uri;

  return jsonSchema.compile(id, { registries: [registry] });
};
