import { unified } from "unified";
import { rejsonParse, rejsonStringify } from "@hyperjump/browser/json";
import { JsonSchema } from "../json-schema.js";
import { jsonSchemaResolve } from "../schema/resolve.js";
import { addV1 } from "../dialects/v1/index.js";
import { addDraft04 } from "../dialects/draft-04/index.js";
import { addDraft06 } from "../dialects/draft-06/index.js";
import { addDraft07 } from "../dialects/draft-07/index.js";
import { addDraft201909 } from "../dialects/draft-2019-09/index.js";
import { addDraft202012 } from "../dialects/draft-2020-12/index.js";
import { addFullFormats } from "../formats/full.js";

/**
 * @import { Processor } from "unified"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);
addDraft04(jsonSchema);
addDraft06(jsonSchema);
addDraft07(jsonSchema);
addDraft201909(jsonSchema);
addDraft202012(jsonSchema);
addFullFormats(jsonSchema);

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
