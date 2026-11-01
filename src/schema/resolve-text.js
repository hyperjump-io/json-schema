import { fromJson, jsonSyntaxErrorMessage } from "@hyperjump/browser";
import { resolveSchema } from "./resolve.js";
import { SchemaError } from "./schema-error.js";

/**
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonDocumentNode } from "@hyperjump/browser"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
 * @import { SchemaMessage } from "./schema-error.d.ts"
 */

/**
 * Parse and resolve a schema document, for a schema that's retrieved or in a
 * registry. A syntax error the parser recovers from doesn't stop it, so
 * every problem in the document is found. A registry entry's `origin` is on
 * the document and its problems.
 *
 * @type (text: string, session: JsonSchemaSession, uri: string, dialectUri: string | undefined, origin?: string) => Promise<JsonSchemaDocumentNode>
 * @throws SchemaError if the document has any problem, because a schema with
 * problems can't be used reliably
 */
export const resolveSchemaText = async (text, session, uri, dialectUri, origin) => {
  const { status, node, errors, comments } = fromJson(text);

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
  if (status !== "failure") {
    /** @type JsonDocumentNode */
    const tree = { type: "json-document", status, children: node ? [node] : [], comments };
    const resolved = await resolveSchema(tree, { session, uri, dialectUri });
    messages.push(...resolved.messages);

    if (messages.length === 0) {
      if (origin !== undefined) {
        resolved.document.origin = origin;
      }
      return resolved.document;
    }
  }

  throw new SchemaError(origin === undefined ? messages : messages.map((message) => ({ ...message, origin })));
};

/**
 * A message on a file as plain data
 *
 * @type (message: VFileMessage, uri: string, severity: SchemaMessage["severity"], origin?: string) => SchemaMessage
 */
export const toSchemaMessage = (message, uri, severity, origin) => {
  /** @type SchemaMessage */
  const schemaMessage = {
    source: message.source ?? "json-schema",
    ruleId: message.ruleId ?? "",
    severity: severity,
    uri: uri,
    place: message.place,
    message: message.reason
  };
  if (message.url !== undefined) {
    schemaMessage.url = message.url;
  }
  if (message.cause !== undefined) {
    schemaMessage.cause = message.cause;
  }
  if (origin !== undefined) {
    schemaMessage.origin = origin;
  }
  return schemaMessage;
};
