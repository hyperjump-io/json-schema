import typeKeyword from "../type.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 * @import { SchemaType } from "../type.js"
 */

/**
 * `type` in draft-04 through 2020-12. It's the same as `type`. These drafts
 * allow an empty array, which nothing is valid against, and v1 doesn't, so
 * it has a URI of its own so lint can tell.
 *
 * @type Keyword<SchemaType | SchemaType[], "data">
 */
export default {
  ...typeKeyword,
  uri: "https://json-schema.org/keyword/draft-2020-12/type"
};
