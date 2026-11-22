import enumKeyword from "../enum.js";
import { array, nonEmpty } from "../checks.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `enum` in draft-04. It's the same as `enum`, except that it can't be
 * empty, as draft-04 says. Draft-04 also says its values must be unique,
 * where later drafts say they should be, but a duplicate changes nothing,
 * so `duplicate-array-items` reports it.
 *
 * @type Keyword<Json[], "data">
 */
export default {
  ...enumKeyword,
  uri: "https://json-schema.org/keyword/draft-04/enum",
  check(valueNode, context) {
    array(valueNode, context);
    nonEmpty(valueNode, context);
  }
};
