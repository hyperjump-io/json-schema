import { fromJs, fromJson, jsonSyntaxErrorMessage } from "@hyperjump/browser";
import { resolveSchema } from "./resolve.js";
import { SchemaError } from "./schema-error.js";
import { noUrl } from "../identifiers.js";

/**
 * @import { VFileMessage } from "vfile-message"
 * @import { Json, JsonDocumentNode } from "@hyperjump/browser"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
 * @import { SchemaMessage } from "./schema-error.d.ts"
 * @import { AbsoluteIri, Iri } from "@hyperjump/uri"
 */

/**
 * Parse and resolve a schema document, for a schema that's retrieved or in a
 * registry. A syntax error the parser recovers from doesn't stop it, so
 * every problem in the document is found. A registry entry's `origin` is on
 * the document and its problems.
 *
 * @type (text: string, session: JsonSchemaSession, uri: AbsoluteIri, dialectUri: string | undefined, origin?: string) => Promise<JsonSchemaDocumentNode>
 * @throws SchemaError if the document has any problem, because a schema with
 * problems can't be used reliably
 */
export const resolveSchemaText = async (text, session, uri, dialectUri, origin) => {
  const { status, node, errors, comments } = fromJson(text, noUrl);

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
  /** @type JsonDocumentNode | undefined */
  const tree = status === "failure" ? undefined : { type: "json-document", status, children: node ? [node] : [], comments, url: noUrl };
  return resolveTree(tree, messages, session, uri, dialectUri, origin);
};

/**
 * Resolve a schema that was added to a registry as a value. Its nodes have
 * no positions, so neither do its problems.
 *
 * @type (value: Json, session: JsonSchemaSession, uri: AbsoluteIri, dialectUri: string | undefined, origin?: string) => Promise<JsonSchemaDocumentNode>
 * @throws SchemaError if the document has any problem
 */
export const resolveSchemaValue = async (value, session, uri, dialectUri, origin) => {
  /** @type JsonDocumentNode */
  const tree = { type: "json-document", status: "success", children: [fromJs(value, noUrl)], comments: [], url: noUrl };
  return resolveTree(tree, [], session, uri, dialectUri, origin);
};

/** @type (tree: JsonDocumentNode | undefined, messages: SchemaMessage[], session: JsonSchemaSession, uri: AbsoluteIri, dialectUri: string | undefined, origin?: string) => Promise<JsonSchemaDocumentNode> */
const resolveTree = async (tree, messages, session, uri, dialectUri, origin) => {
  if (tree !== undefined) {
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
 * @type (message: VFileMessage, uri: Iri, severity: SchemaMessage["severity"], origin?: string) => SchemaMessage
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
