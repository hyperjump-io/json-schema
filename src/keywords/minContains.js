/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `minContains`. The minimum number of items that pass the sibling `contains`. It has no effect on its own. `contains` reads it.
 *
 * @type Keyword
 */
export default {
  uri: "https://json-schema.org/keyword/minContains",
  shape: "data",
  valueSchema: new URL("./minContains.schema.json", import.meta.url).href
};
