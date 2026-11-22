import recommended from "./recommended.js";
import discriminatorWithoutComposition from "./rules/discriminator-without-composition.js";
import discriminatorMappingWithoutTarget from "./rules/discriminator-mapping-without-target.js";
import discriminatorPropertyOptional from "./rules/discriminator-property-optional.js";
import deprecatedExample from "./rules/deprecated-example.js";
import unknownField from "./rules/unknown-field.js";
import wrappedWithoutArray from "./rules/wrapped-without-array.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const openApi31 = {
  plugins: [
    recommended,
    // OpenAPI says it's "legal only when using" one of them
    [discriminatorWithoutComposition, ["error"]],
    [discriminatorMappingWithoutTarget, ["error"]],
    // 3.0.4 and 3.1.1 say it SHOULD be required
    [discriminatorPropertyOptional, ["warn"]],
    [unknownField, ["warn"]],
    [deprecatedExample, ["warn"]],
    [wrappedWithoutArray, ["warn"]]
  ]
};

export default openApi31;
