/**
 * @import { Json } from "@hyperjump/browser/json"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { JsonSchema } from "../json-schema.d.ts"
 */

/**
 * A property of a schema that isn't a keyword in its dialect. Each one gets
 * this URI with its name as the fragment
 * (`https://json-schema.org/keyword/unknown#foo`). The dialect, usually
 * through its meta-schema, decides whether unknown keywords are allowed.
 * It's added to every {@link JsonSchema} by default. Add a keyword with this
 * URI to change how unknown keywords are handled.
 *
 * Unknown keywords are annotations in dialects whose `unknownKeywords` is
 * `annotation`. In dialects whose `unknownKeywords` is `error`, keywords
 * starting with `x-` are allowed, and they're annotations (v1). Otherwise,
 * they have no effect.
 *
 * @type Keyword<Json>
 */
export default {
  uri: "https://json-schema.org/keyword/unknown",
  shape: "data",
  lower(value, _siblings, { dialect, keywordName }) {
    const { unknownKeywords } = dialect;
    const isAnnotation = unknownKeywords === "annotation" || (unknownKeywords === "error" && keywordName.startsWith("x-"));
    return isAnnotation ? { op: "annotate", value } : { op: "pass" };
  }
};

/**
 * The URI a keyword's definition is registered by. An unknown keyword's URI
 * has the keyword's name as its fragment, but the definition is registered
 * without it.
 *
 * @type (keywordUri: string) => string
 */
export const keywordDefinitionUri = (keywordUri) => {
  const fragmentIndex = keywordUri.indexOf("#");
  return fragmentIndex === -1 ? keywordUri : keywordUri.slice(0, fragmentIndex);
};
