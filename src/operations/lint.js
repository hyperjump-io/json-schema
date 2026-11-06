import { unified } from "unified";
import { VFile } from "vfile";
import { relativeFileUri } from "@hyperjump/browser";
import { SchemaError } from "../schema/schema-error.js";
import { toSchemaMessage } from "../schema/resolve-text.js";
import { sessionOf } from "./context.js";

/**
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import * as API from "./lint.d.ts"
 */

/** @type typeof API.lint */
export const lint = async (context, uri, options = {}) => {
  const session = sessionOf(context, options);

  let document;
  try {
    document = await session.getDocument(uri);
  } catch (error) {
    // A document with problems has no tree to lint
    if (error instanceof SchemaError) {
      return error.messages;
    }
    throw error;
  }

  if (document.type !== "json-schema-document") {
    throw Error(`'${relativeFileUri(uri)}' isn't a schema. It's ${document.mediaType}.`);
  }

  // Loaded when it's needed, so code that never lints never loads the rules
  const plugins = options.plugins ?? [(await import("../lint/recommended.js")).default];
  const linter = unified()
    .use(plugins)
    .freeze();
  const tree = /** @type JsonSchemaDocumentNode */ (/** @type unknown */ (document));
  const file = new VFile({ data: { jsonSchemaSession: session } });
  await linter.run(/** @type any */ (tree), file);

  return file.messages.map((message) => toSchemaMessage(message, tree.uri, message.fatal ? "error" : "warn", tree.origin));
};
