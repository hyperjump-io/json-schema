import anchorKeyword from "../anchor.js";
import keywordSchema from "./anchor.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `$anchor` in 2019-09. It's the same as since 2020-12, except for which
 * names are allowed: they can contain `:` but can't start with `_`.
 *
 * @type Keyword
 */
export default {
  ...anchorKeyword,
  uri: "https://json-schema.org/keyword/draft-2019-09/anchor",
  schema: keywordSchema
};
