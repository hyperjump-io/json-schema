import { resolveIri, toAbsoluteIri } from "@hyperjump/uri";
import { JsonSchema } from "../json-schema.js";
import { SchemaRegistry } from "../schema-registry.js";
import { addFullFormats } from "../formats/full.js";
import { v1DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Validator } from "../json-schema.d.ts"
 */

// Shared by the JSON-Schema-Test-Suite runners

/**
 * The suite's number for v1. It's in the spec but not released, which the
 * suite calls 9999.
 */
export const version = 9999;

/**
 * Whether a test case's `compatibility` includes {@link version}. This is
 * the algorithm from the suite's README.
 *
 * @type (compatibility: string | undefined) => boolean
 */
export const isCompatible = (compatibility) => {
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
 * @type () => JsonSchema
 */
export const testSuiteJsonSchema = () => {
  const jsonSchema = new JsonSchema();
  addFullFormats(jsonSchema);
  jsonSchema.removeUriSchemePlugin("http");
  jsonSchema.removeUriSchemePlugin("https");

  return jsonSchema;
};

/**
 * Compile a test case's schema. External schema URIs aren't unique across
 * test cases, so each test case has its own registry. The suite's schemas
 * don't have `$schema`, so they're v1.
 *
 * @type (jsonSchema: JsonSchema, uri: string, schema: Json, externalSchemas?: Record<string, Json>) => Promise<Validator>
 */
export const compileTestCase = async (jsonSchema, uri, schema, externalSchemas = {}) => {
  const registry = new SchemaRegistry();
  for (const externalUri in externalSchemas) {
    registry.add(externalSchemas[externalUri], { retrievalUri: externalUri, dialectUri: v1DialectUri });
  }
  registry.add(schema, { retrievalUri: uri, dialectUri: v1DialectUri });

  // A schema is identified by its `$id`, which is relative to the URI it was
  // retrieved from
  const id = typeof schema === "object" && schema !== null && !Array.isArray(schema) && typeof schema.$id === "string"
    ? toAbsoluteIri(resolveIri(schema.$id, uri))
    : uri;

  return jsonSchema.compile(id, { registries: [registry] });
};
