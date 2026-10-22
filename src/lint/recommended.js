import thenElseWithoutIf from "./rules/then-else-without-if.js";
import ifWithoutThenElse from "./rules/if-without-then-else.js";
import duplicateEnumValues from "./rules/duplicate-enum-values.js";
import emptyEnum from "./rules/empty-enum.js";
import emptyType from "./rules/empty-type.js";
import duplicateOneOfSchemas from "./rules/duplicate-one-of-schemas.js";
import contradictoryLimits from "./rules/contradictory-limits.js";
import readOnlyAndWriteOnly from "./rules/read-only-and-write-only.js";
import minMaxContainsWithoutContains from "./rules/min-max-contains-without-contains.js";
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
    [emptyEnum, ["warn"]],
    [emptyType, ["warn"]],
    [duplicateOneOfSchemas, ["warn"]],
    [contradictoryLimits, ["warn"]],
    [readOnlyAndWriteOnly, ["warn"]],
    [minMaxContainsWithoutContains, ["warn"]],
    [referenceWithoutTarget, ["error"]]
  ]
};

export default recommended;
