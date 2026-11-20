import type { Format } from "../format.d.ts";

/**
 * The formats JSON Schema defines, except the ones that need large tables
 * of Unicode data (`idn-hostname`, `idn-email`, and draft-07 through
 * 2020-12's `hostname`). See
 * `full.js` for those.
 */
export const liteFormats: Format[];
