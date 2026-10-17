import type { JsonSchema } from "../json-schema.d.ts";
import type { Format } from "../format.d.ts";

/**
 * Every format JSON Schema defines. It adds `hostname`, `idn-hostname`, and
 * `idn-email` to the lite formats. They need large tables of Unicode data,
 * so they're only loaded if this module is imported.
 */
export const fullFormats: Format[];

/** Add the {@link fullFormats} to a {@link JsonSchema} */
export const addFullFormats: (jsonSchema: JsonSchema) => void;
