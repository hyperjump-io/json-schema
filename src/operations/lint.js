import { unified } from "unified";
import { VFile } from "vfile";
import { relativeFileUrl } from "@hyperjump/browser";
import { SchemaError } from "../schema/schema-error.js";
import { toSchemaMessage } from "../schema/resolve-text.js";
import { browse } from "../session.js";
import { callSession } from "./call-session.js";
import { isSchemaDocument } from "../schema/schema-nodes.js";

/**
 * @import { IriReference } from "@hyperjump/uri"
 * @import { JsonSchemaDocumentNode } from "../schema/schema-ast.d.ts"
 * @import * as API from "./lint.d.ts"
 */

/** @type typeof API.lint */
export const lint = async (config, uri, options = {}) => {
  const { session } = callSession(config, uri, options);

  let document;
  try {
    document = (await browse(session, uri, { reference: "manual" })).document;
  } catch (error) {
    // A document with problems has no tree to lint
    if (error instanceof SchemaError) {
      return error.messages;
    }
    throw error;
  }

  if (!isSchemaDocument(document)) {
    // `browse` checked it
    throw Error(`'${relativeFileUrl(/** @type IriReference */ (uri))}' isn't a schema`);
  }

  // Loaded when it's needed, so code that never lints never loads the rules
  const plugins = options.plugins ?? [(await import("../lint/recommended.js")).default];
  const linter = unified()
    .use(plugins)
    .freeze();
  const file = new VFile({ data: { jsonSchemaSession: session } });
  await linter.run(/** @type any */ (document), file);

  return file.messages.map((message) => toSchemaMessage(message, document.uri, message.fatal ? "error" : "warn", document.origin));
};
