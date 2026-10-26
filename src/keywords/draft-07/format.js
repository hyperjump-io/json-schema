import formatKeyword from "../format.js";
import { string } from "../checks.js";

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `format` in draft-04 through draft-07. It's the same as `format` since
 * 2019-09, except that a format the dialect doesn't support is only an
 * annotation, even when formats are validated, as these drafts say.
 *
 * @type Keyword<string, "data">
 */
export default {
  ...formatKeyword,
  uri: "https://json-schema.org/keyword/draft-07/format",
  check: string,
  lower(name, siblings, context) {
    const { formats } = context.dialect;
    if (!(formats && Object.hasOwn(formats, name))) {
      return { op: "format", name, uri: null, assert: false };
    }

    return /** @type NonNullable<typeof formatKeyword.lower> */ (formatKeyword.lower)(name, siblings, context);
  }
};
