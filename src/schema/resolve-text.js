import { unified } from "unified";
import { VFile } from "vfile";
import { rejsonParse } from "@hyperjump/browser/json";
import { jsonSchemaResolve } from "./resolve.js";
import { SchemaError } from "./schema-error.js";

/**
 * @import { VFileMessage } from "vfile-message"
 * @import { JsonSchemaSession } from "../session.d.ts"
 * @import { JsonSchemaDocumentNode } from "./schema-ast.d.ts"
 * @import { SchemaMessage } from "./schema-error.d.ts"
 */

/**
 * Parse and resolve a schema document, for a schema that's retrieved or in a
 * registry. A syntax error the parser recovers from doesn't stop it, so
 * every problem in the document is found.
 *
 * @type (text: string, session: JsonSchemaSession, uri: string, dialectUri: string | undefined) => Promise<JsonSchemaDocumentNode>
 * @throws SchemaError if the document has any problem, because a schema with
 * problems can't be used reliably
 */
export const resolveSchemaText = async (text, session, uri, dialectUri) => {
  const file = new VFile(text);
  const processor = unified()
    .use(rejsonParse, { accept: "recovered" })
    .use(jsonSchemaResolve, { session, uri, dialectUri });

  /** @type JsonSchemaDocumentNode | undefined */
  let document;
  try {
    document = /** @type JsonSchemaDocumentNode */ (await processor.run(processor.parse(file), file));
  } catch (error) {
    // A syntax error the parser can't recover from fails the file. Every
    // syntax error is on the file by then.
    if (!file.messages.includes(/** @type any */ (error))) {
      throw error;
    }
  }

  if (document === undefined || file.messages.length > 0) {
    throw schemaError(file, uri);
  }

  return document;
};

/**
 * A message on a file as plain data
 *
 * @type (message: VFileMessage, uri: string, severity: SchemaMessage["severity"]) => SchemaMessage
 */
export const toSchemaMessage = (message, uri, severity) => {
  /** @type SchemaMessage */
  const schemaMessage = {
    source: message.source ?? "json-schema",
    ruleId: message.ruleId ?? "",
    severity: severity,
    uri: uri,
    place: message.place,
    message: message.reason
  };
  if (message.cause !== undefined) {
    schemaMessage.cause = message.cause;
  }
  return schemaMessage;
};

/**
 * Every message on a file that was resolved as a schema, as a SchemaError. A
 * schema with any problem can't be used, so they're all errors.
 *
 * @type (file: VFile, uri: string) => SchemaError
 */
const schemaError = (file, uri) => {
  return new SchemaError(file.messages.map((message) => toSchemaMessage(message, uri, "error")));
};
