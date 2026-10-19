import { pathToFileURL } from "node:url";
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

/**
 * @import { Processor, Transformer } from "unified"
 * @import { JsonDocumentNode } from "@hyperjump/browser/json"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 */

const jsonSchema = new JsonSchema();
addV1(jsonSchema);
addDraft04(jsonSchema);
addDraft06(jsonSchema);
addDraft07(jsonSchema);
addDraft201909(jsonSchema);
addDraft202012(jsonSchema);

/**
 * Resolves a schema, which finds every problem with it. The engine makes a
 * processor for each file, so each file is resolved in its own session and
 * sees meta-schemas as they are now, which matters in watch mode.
 *
 * Input from stdin has no path. It's resolved as if it were in the working
 * directory, so relative identifiers and references resolve against it.
 *
 * @this {Processor}
 * @returns {Transformer<JsonDocumentNode, JsonSchemaDocumentNode>}
 */
function jsonSchemaLint() {
  const session = jsonSchema.session();
  return (tree, file) => {
    const uri = file.path === undefined ? pathToFileURL(`${file.cwd}/`).href : undefined;
    return /** @type Function */ (jsonSchemaResolve).call(this, { session, uri })(tree, file);
  };
}

/**
 * Lints schemas. Syntax errors are reported without failing the file, so the
 * rest of the schema is still checked.
 */
export const jsonschema = unified()
  .use(rejsonParse, { accept: "recovered" })
  .use(jsonSchemaLint)
  .use(rejsonStringify)
  .freeze();
