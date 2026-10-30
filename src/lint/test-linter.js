import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { v1Dialect } from "../dialects/v1/index.js";
import { draft04Dialect } from "../dialects/draft-04/index.js";
import { draft06Dialect } from "../dialects/draft-06/index.js";
import { draft07Dialect } from "../dialects/draft-07/index.js";
import { draft201909Dialect } from "../dialects/draft-2019-09/index.js";
import { draft202012Dialect } from "../dialects/draft-2020-12/index.js";
import { fullFormats } from "../formats/full.js";

/**
 * @import { Processor } from "unified"
 */

const jsonSchema = new JsonSchema({ dialects: [v1Dialect, draft04Dialect, draft06Dialect, draft07Dialect, draft201909Dialect, draft202012Dialect], formats: fullFormats });

/**
 * For testing lint rules: resolves a schema with every preset's dialect, as
 * the CLI does. Syntax errors are reported without failing the file.
 */
export const linter = unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(resolveInNewSession)
  .use(rejsonStringify)
  .freeze();

/**
 * Each processor resolves in a new session
 *
 * @this {Processor}
 */
function resolveInNewSession() {
  return /** @type Function */ (jsonSchemaResolve).call(this, { session: jsonSchema.session() });
}
