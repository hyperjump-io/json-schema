import { registriesOf } from "../session.js";

/**
 * @import { JsonSchemaHyperjump } from "../session.d.ts"
 * @import { ReadonlyJson } from "@hyperjump/browser"
 * @import { SchemaSource } from "./schema-source.d.ts"
 */

// What every operation does with its schema. It isn't part of the API.

/**
 * The URI of the schema an operation is given. A schema given as a value is
 * added to the operation's session.
 *
 * @type (session: JsonSchemaHyperjump, schema: SchemaSource) => string
 */
export const schemaUri = (session, schema) => typeof schema === "string" ? schema : registriesOf(session).addValue(/** @type ReadonlyJson */ (schema));
