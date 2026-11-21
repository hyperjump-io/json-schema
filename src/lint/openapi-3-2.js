import recommended from "./recommended.js";
import unknownField from "./rules/unknown-field.js";

/**
 * @import { Preset } from "unified"
 */

/** @type Preset */
const openApi32 = {
  plugins: [
    recommended,
    [unknownField, ["warn"]]
  ]
};

export default openApi32;
