import { assertIri, isIri } from "@hyperjump/uri";
import { iriPlace, iriProblem } from "../identifiers.js";
import { boolean } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `$vocabulary` (2019-09, 2020-12). It makes a meta-schema define the dialect
 * it identifies, with the keywords of the vocabularies it lists. A required
 * vocabulary (`true`) that the JSON Schema media types don't know is a problem
 * with the meta-schema. An optional one (`false`) is skipped. Entries that
 * aren't booleans are ignored.
 *
 * Vocabularies are in the media types' definitions, from their dialects and
 * their `vocabularies`, so every dialect that has `$vocabulary` sees all of
 * them.
 *
 * @type Keyword<Record<string, boolean>, "data">
 */
export default {
  uri: "https://json-schema.org/keyword/vocabulary",
  shape: "data",
  check(valueNode, context) {
    if (valueNode.jsonType !== "object") {
      context.message("Expected an object");
      return;
    }

    for (const property of valueNode.children) {
      const [nameNode, requiredNode] = property.children;
      try {
        assertIri(nameNode.value);
      } catch (error) {
        context.message(`'${nameNode.value}' isn't a valid URI: ${iriProblem(error)}`, { type: nameNode.type, position: iriPlace(nameNode, error) });
      }
      boolean(requiredNode, context);
    }
  },
  resolve(valueNode, context) {
    if (valueNode.type !== "json" || valueNode.jsonType !== "object") {
      return;
    }

    /** @type Record<string, string> */
    const keywords = {};

    /** @type Record<string, string> */
    const formats = {};
    let assertFormats = false;
    let isSupported = true;
    for (const property of valueNode.children) {
      const [nameNode, requiredNode] = property.children;
      // `check` reports a name that isn't a URI
      if (requiredNode.type !== "json" || requiredNode.jsonType !== "boolean" || !isIri(nameNode.value)) {
        continue;
      }

      const vocabulary = context.vocabulary(nameNode.value);
      if (vocabulary) {
        Object.assign(keywords, vocabulary.keywords);
        Object.assign(formats, vocabulary.formats);
        assertFormats ||= vocabulary.assertFormats ?? false;
      } else if (requiredNode.value) {
        context.message(`The '${nameNode.value}' vocabulary isn't supported. Add it to the 'vocabularies' config.`, nameNode);
        isSupported = false;
      }
    }

    if (isSupported) {
      context.defineDialect({ keywords, unknownKeywords: "annotation", formats, assertFormats });
    }
  }
};
