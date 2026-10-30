import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "./resolve.js";
import { SchemaError } from "./schema-error.js";

/**
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonDocumentNode } from "@hyperjump/browser/json"
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
  const file = new VFile(text);

  /** @type JsonSchemaDocumentNode | undefined */
  let document;
  try {
    // The resolver's transformer doesn't use the processor
    const resolve = /** @type Function */ (jsonSchemaResolve).call(undefined, { session, uri, dialectUri });
    document = /** @type JsonSchemaDocumentNode */ (await resolve(parse(file), file));
  } catch (error) {
    // A syntax error the parser can't recover from fails the file. Every
    // syntax error is on the file by then.
    if (!file.messages.includes(/** @type any */ (error))) {
      throw error;
    }
  }

  if (document === undefined || file.messages.length > 0) {
    throw schemaError(file, uri, origin);
  }

  if (origin !== undefined) {
    document.origin = origin;
  }
  return document;
};

/**
 * Parse a file the way `rejsonParse` does in a pipeline, with what it sets
 * as the parser. A schema is resolved without a unified processor, so code
 * that only loads schemas doesn't load unified.
 *
 * @type (file: VFile) => JsonDocumentNode
 */
const parse = (file) => {
  /** @type {{ parser?: (document: string, file: VFile) => JsonDocumentNode }} */
  const processor = {};
  rejsonParse.call(/** @type any */ (processor), { accept: "recovered" });
  return /** @type NonNullable<typeof processor.parser> */ (processor.parser)(String(file), file);
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

/**
 * Every message on a file that was resolved as a schema, as a SchemaError. A
 * schema with any problem can't be used, so they're all errors.
 *
 * @type (file: VFile, uri: string, origin: string | undefined) => SchemaError
 */
const schemaError = (file, uri, origin) => {
  return new SchemaError(file.messages.map((message) => toSchemaMessage(message, uri, "error", origin)));
};
