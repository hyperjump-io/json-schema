import { string } from "./checks.js";

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `contentMediaType`. The media type of a string instance's content. It's an annotation, so the content isn't parsed.
 *
 * @type Keyword<string>
 */
export default {
  uri: "https://json-schema.org/keyword/contentMediaType",
  shape: "data",
  check: string,
  lower: (value) => ({ op: "annotate", value, types: ["string"] })
};
