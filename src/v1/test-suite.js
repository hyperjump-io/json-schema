import { toAbsoluteIri } from "@hyperjump/uri";
import { v1DialectUri } from "./index.js";

/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { UriSchemePlugin } from "@hyperjump/browser"
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
 * Serves schemas from memory instead of `http(s):`, so the suite doesn't
 * need a server. The suite's schemas don't have `$schema`, so they're served
 * as v1.
 *
 * @implements UriSchemePlugin
 */
export class MemoryUriSchemePlugin {
  /** @type Record<string, Json> */
  #schemas;

  /**
   * @param {Record<string, Json>} schemas
   */
  constructor(schemas) {
    this.schemes = ["http", "https"];

    this.#schemas = schemas;
  }

  /** @type UriSchemePlugin["retrieve"] */
  async retrieve(uri) {
    const id = toAbsoluteIri(uri);
    if (!(id in this.#schemas)) {
      throw Error(`'${id}' isn't in the test case`);
    }

    const response = new Response(JSON.stringify(this.#schemas[id]), {
      headers: { "Content-Type": `application/schema+json; schema="${v1DialectUri}"` }
    });
    Object.defineProperty(response, "url", { value: id });

    return response;
  }
}
