import recommended from "./recommended.js";
import discriminatorWithoutComposition from "./rules/discriminator-without-composition.js";
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
    [unknownField, ["warn"]],
    [deprecatedExample, ["warn"]],
    [wrappedWithoutArray, ["warn"]]
  ]
};

export default openApi31;
