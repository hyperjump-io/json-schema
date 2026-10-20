import thenElseWithoutIf from "./rules/then-else-without-if.js";
import minMaxContainsWithoutContains from "./rules/min-max-contains-without-contains.js";
import exclusiveWithoutMaximumMinimum from "./rules/exclusive-without-maximum-minimum.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const recommended = {
  plugins: [
    [thenElseWithoutIf, ["warn"]],
    [minMaxContainsWithoutContains, ["warn"]],
    [exclusiveWithoutMaximumMinimum, ["warn"]]
  ]
};

export default recommended;
