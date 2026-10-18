import keywordSchema from "./exclusiveMaximum.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMaximum` in draft-04. It's a boolean that makes the sibling
 * `maximum` exclusive. It has no effect on its own.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMaximum",
  shape: "data",
  schema: keywordSchema
};
