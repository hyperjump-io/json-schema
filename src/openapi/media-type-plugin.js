import { fromJson, jsonSyntaxErrorMessage } from "@hyperjump/browser";
import { toAbsoluteIri, urlToIri } from "@hyperjump/uri";
import { noUrl } from "../identifiers.js";
import { SchemaError } from "../schema/schema-error.js";
import { resolveOpenApi } from "./resolve.js";
import { defaultDialectFor } from "../default-dialects.js";

/**
 * @import { SchemaMessage } from "../schema/schema-error.d.ts"
 * @import * as API from "./index.d.ts"
 */

/** @type typeof API.openApiMediaType */
export const openApiMediaType = Object.freeze({
  mediaType: "application/openapi+json",
  extensions: ["/openapi.json"],

  /** @type typeof API.openApiMediaType.parse */
  parse: async (response, session) => {
    // A schema's identifiers are IRIs, so the response's URL is converted
    // where it comes in
    const uri = toAbsoluteIri(urlToIri(new URL(response.url)));
    const dialectUri = defaultDialectFor(/** @type any */ (session), response.url);
    return parseOpenApi(await response.text(), /** @type any */ (session), uri, dialectUri);
  }
});

/** @type typeof API.parseOpenApi */
export const parseOpenApi = async (text, session, uri, dialectUri) => {
  const { document: tree, errors } = fromJson(text, noUrl);

  /** @type SchemaMessage[] */
  const messages = errors.map((error) => ({
    source: error.source,
    ruleId: error.ruleId,
    severity: "error",
    uri: uri,
    place: error.place,
    message: jsonSyntaxErrorMessage(error)
  }));

  // A syntax error the parser can't recover from leaves nothing to resolve
  if (tree.status !== "failure") {
    const resolved = await resolveOpenApi(tree, { session, uri, dialectUri });
    messages.push(...resolved.messages);
    if (messages.length === 0) {
      // Without problems, the parse succeeded
      return /** @type API.OpenApiDocument */ (resolved.document);
    }
  }

  throw new SchemaError(messages);
};
