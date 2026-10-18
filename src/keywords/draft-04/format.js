import formatKeyword from "../format.js";
import keywordSchema from "./format.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../../keyword.d.ts"
 */

/**
 * `format` in draft-04 through draft-07. It's the same as `format` since
 * 2019-09, except that a format the dialect doesn't support is only an
 * annotation, even when formats are validated, as these drafts say.
 *
 * @type Keyword<{ name: string; uri: string | null }>
 */
export default {
  ...formatKeyword,
  uri: "https://json-schema.org/keyword/draft-04/format",
  schema: keywordSchema,
  compile(valueNode, context) {
    const { formats } = context.dialect;
    if (valueNode.type === "json" && valueNode.jsonType === "string" && !(formats && Object.hasOwn(formats, valueNode.value))) {
      return { name: valueNode.value, uri: null };
    }

    return /** @type NonNullable<typeof formatKeyword.compile> */ (formatKeyword.compile)(valueNode, context);
  }
};
