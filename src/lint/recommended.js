import thenElseWithoutIf from "./rules/then-else-without-if.js";
import ifWithoutThenElse from "./rules/if-without-then-else.js";
import duplicateEnumValues from "./rules/duplicate-enum-values.js";
import minMaxContainsWithoutContains from "./rules/min-max-contains-without-contains.js";
import exclusiveWithoutMaximumMinimum from "./rules/exclusive-without-maximum-minimum.js";
import referenceWithoutTarget from "./rules/reference-without-target.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const recommended = {
  plugins: [
    [thenElseWithoutIf, ["warn"]],
    [ifWithoutThenElse, ["warn"]],
    [duplicateEnumValues, ["warn"]],
    [minMaxContainsWithoutContains, ["warn"]],
    [exclusiveWithoutMaximumMinimum, ["warn"]],
    [referenceWithoutTarget, ["error"]]
  ]
};

export default recommended;
