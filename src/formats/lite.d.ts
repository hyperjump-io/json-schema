import type { JsonSchema } from "../json-schema.d.ts";
import type { Format } from "../format.d.ts";

/**
 * The formats JSON Schema defines, except the ones that need large tables
 * of Unicode data (`hostname`, `idn-hostname`, and `idn-email`). See
 * `full.js` for those.
 */
export const liteFormats: Format[];

/** Add the {@link liteFormats} to a {@link JsonSchema} */
export function addLiteFormats(jsonSchema: JsonSchema): void;
