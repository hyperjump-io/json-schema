import { outputErrorMessage } from "../output/validation-error.js";
import { BASIC } from "../output/basic.js";
import { validatorFor } from "../operations/validate-compiled.js";

/**
 * @import * as API from "./validate.d.ts"
 */

/** @type API.jsonSchemaValidate */
export function jsonSchemaValidate(options) {
  return (tree, file) => {
    // A document without a value has a syntax error from the parser
    const node = tree.children[0];
    if (node === undefined) {
      return;
    }

    const { errors } = validatorFor(options.compiled, { input: "node", output: BASIC })(node);
    for (const error of errors) {
      const message = file.message(outputErrorMessage(error), {
        place: error.place,
        ruleId: error.ruleId,
        source: error.source
      });
      message.fatal = true;
    }
  };
}
