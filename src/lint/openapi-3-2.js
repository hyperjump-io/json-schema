import recommended from "./recommended.js";
import discriminatorWithoutComposition from "./rules/discriminator-without-composition.js";
import discriminatorMappingWithoutTarget from "./rules/discriminator-mapping-without-target.js";
import discriminatorPropertyOptional from "./rules/discriminator-property-optional.js";
import deprecatedExample from "./rules/deprecated-example.js";
import deprecatedXmlField from "./rules/deprecated-xml-field.js";
import unknownField from "./rules/unknown-field.js";
import wrappedWithoutArray from "./rules/wrapped-without-array.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const openApi32 = {
  plugins: [
    recommended,
    // OpenAPI says it's "legal only when using" one of them
    [discriminatorWithoutComposition, ["error"]],
    [discriminatorMappingWithoutTarget, ["error"]],
    // 3.2 says an optional one MUST have `defaultMapping`
    [discriminatorPropertyOptional, ["error"]],
    [unknownField, ["warn"]],
    [deprecatedExample, ["warn"]],
    [deprecatedXmlField, ["warn"]],
    [wrappedWithoutArray, ["warn"]]
  ]
};

export default openApi32;
