import recommended from "./recommended.js";
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
    [unknownField, ["warn"]],
    [deprecatedExample, ["warn"]],
    [deprecatedXmlField, ["warn"]],
    [wrappedWithoutArray, ["warn"]]
  ]
};

export default openApi32;
