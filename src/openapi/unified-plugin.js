import { urlToIri } from "@hyperjump/uri";
import { assertDefaultDialects, resolveOpenApi } from "./resolve.js";

/**
 * @import * as API from "./index.d.ts"
 */

/**
 * `resolveOpenApi` as a unified plugin, like `jsonSchemaResolve`: the
 * document's URI comes from the file's path, and each problem is an error
 * on the file
 *
 * @type typeof API.openApiResolve
 */
export function openApiResolve(options) {
  assertDefaultDialects(options.defaultDialects ?? {});
  return async (tree, file) => {
    const uri = urlToIri(new URL(tree.url));

    // Lint rules find other schemas in the same session
    file.data.jsonSchemaSession = options.session;

    const { document, messages } = await resolveOpenApi(tree, { ...options, uri });
    for (const { message, place, ruleId, source, cause } of messages) {
      file.message(message, { place, ruleId, source, cause: /** @type Error | undefined */ (cause) }).fatal = true;
    }
    return document;
  };
}
