import recommended from "./recommended.js";
import unknownField from "./rules/unknown-field.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const openApi31 = {
  plugins: [
    recommended,
    [unknownField, ["warn"]]
  ]
};

export default openApi31;
