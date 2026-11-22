import recommended from "./recommended.js";
import discriminatorWithoutComposition from "./rules/discriminator-without-composition.js";
import discriminatorMappingWithoutTarget from "./rules/discriminator-mapping-without-target.js";
import arrayWithoutItems from "./rules/array-without-items.js";
import implicitDialect from "./rules/implicit-dialect.js";
import readOnlyAndWriteOnly from "./rules/read-only-and-write-only.js";
import unknownField from "./rules/unknown-field.js";
import wrappedWithoutArray from "./rules/wrapped-without-array.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const openApi30 = {
  plugins: [
    recommended,
    // OpenAPI says it's "legal only when using" one of them
    [discriminatorWithoutComposition, ["error"]],
    [discriminatorMappingWithoutTarget, ["error"]],
    [arrayWithoutItems, ["error"]],
    // 3.0 says they MUST NOT both be true. JSON Schema allows it.
    [readOnlyAndWriteOnly, ["error"]],
    // 3.0's Schema Objects don't have `$schema`, so the dialect is always
    // implicit
    [implicitDialect, ["off"]],
    [unknownField, ["warn"]],
    [wrappedWithoutArray, ["warn"]]
  ]
};

export default openApi30;
