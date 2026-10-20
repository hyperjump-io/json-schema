import thenElseWithoutIf from "./rules/then-else-without-if.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const recommended = {
  plugins: [
    [thenElseWithoutIf, ["warn"]]
  ]
};

export default recommended;
