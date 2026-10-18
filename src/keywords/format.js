import { jsonValue } from "@hyperjump/browser/json";
import keywordSchema from "./format.schema.json" with { type: "json" };

/**
 * @import { Keyword } from "../keyword.d.ts"
 */

/**
 * `format`. It's always an annotation. It also validates if the
 * `validateFormats` config says so, or the dialect does by default. Then
 * the format has to be one the dialect supports, and its definition has to
 * have been added, or the schema can't be compiled.
 *
 * @type Keyword<{ name: string; uri: string | null }>
 */
export default {
  uri: "https://json-schema.org/keyword/format",
  shape: "data",
  schema: keywordSchema,
  compile(valueNode, { jsonSchema, dialect }) {
    const name = /** @type string */ (jsonValue(valueNode));
    if (!(jsonSchema.config.validateFormats ?? dialect.assertFormats ?? false)) {
      return { name, uri: null };
    }

    const uri = dialect.formats && Object.hasOwn(dialect.formats, name) ? dialect.formats[name] : undefined;
    if (uri === undefined) {
      throw Error(`The '${name}' format isn't supported in the '${dialect.uri}' dialect`);
    }
    jsonSchema.getFormat(uri);

    return { name, uri };
  },
  evaluate({ name, uri }, { jsonSchema, instance, annotate }) {
    if (uri === null) {
      if (annotate === undefined) {
        return () => true;
      }

      return () => {
        annotate(name);
        return true;
      };
    }

    const { validate } = jsonSchema.getFormat(uri);
    return (node) => {
      if (!validate(instance.value(node))) {
        return false;
      }

      annotate?.(name);
      return true;
    };
  }
};
