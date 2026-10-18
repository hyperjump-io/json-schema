import keywordSchema from "./exclusiveMinimum.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `exclusiveMinimum` in draft-04. It's a boolean that makes the sibling
 * `minimum` exclusive. It has no effect on its own.
 *
 * @type Keyword<boolean>
 */
export default {
  uri: "https://json-schema.org/keyword/draft-04/exclusiveMinimum",
  shape: "data",
  schema: keywordSchema
};
