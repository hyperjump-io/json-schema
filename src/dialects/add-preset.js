import { liteFormats } from "../formats/lite.js";

/**
 * @import { JsonSchema } from "../json-schema.d.ts"
 * @import { Dialect, DialectExtension } from "../dialect.d.ts"
 * @import { Keyword } from "../keyword.d.ts"
 * @import { Format } from "../format.d.ts"
 */

/**
 * @typedef {{
 *   keywords: Keyword<any>[];
 *   formats?: Format[];
 *   extension?: DialectExtension;
 * }} PresetOptions
 */

/**
 * Add a preset's dialect, extended with `extension`, and the keywords and
 * formats it uses that haven't been added. `keywords` is every keyword
 * definition the dialect uses. `formats` is the preset's own formats, in
 * addition to the lite formats. Presets don't depend on each other, and a
 * keyword or format that was replaced stays replaced, whichever order
 * they're added in.
 *
 * Formats that aren't in the lite formats or the preset's own, like
 * `hostname`, are only there if they've been added, such as with the full
 * formats.
 *
 * @type (jsonSchema: JsonSchema, dialect: Dialect, options: PresetOptions) => void
 */
export const addPreset = (jsonSchema, dialect, options) => {
  // Throws if it's already been added, before anything else is
  jsonSchema.addDialect(dialect);
  if (options.extension) {
    jsonSchema.extendDialect(dialect.uri, options.extension);
  }
  dialect = jsonSchema.getDialect(dialect.uri);

  const keywords = new Map(options.keywords.map((keyword) => [keyword.uri, keyword]));
  for (const uri of Object.values(dialect.keywords)) {
    const keyword = keywords.get(uri);
    if (keyword === undefined) {
      throw Error(`The '${dialect.uri}' preset has no definition for the '${uri}' keyword`);
    }

    if (!jsonSchema.hasKeyword(uri)) {
      jsonSchema.addKeyword(keyword);
    }
  }

  const formats = new Map([...liteFormats, ...options.formats ?? []].map((format) => [format.uri, format]));
  for (const uri of Object.values(dialect.formats ?? {})) {
    const format = formats.get(uri);
    if (format !== undefined && !jsonSchema.hasFormat(uri)) {
      jsonSchema.addFormat(format);
    }
  }
};
