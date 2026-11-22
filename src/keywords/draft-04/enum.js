import enumKeyword from "../enum.js";

/**
 * @import { Json } from "@hyperjump/browser"
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `enum` in draft-04. It's the same as `enum`. Draft-04 says it can't be
 * empty and its values must be unique, where later drafts say they should,
 * but an empty `enum` allows nothing and a duplicate changes nothing, so
 * `empty-array` and `duplicate-array-items` report them. It has a URI of
 * its own so lint can tell.
 *
 * @type Keyword<Json[], "data">
 */
export default {
  ...enumKeyword,
  uri: "https://json-schema.org/keyword/draft-04/enum"
};
