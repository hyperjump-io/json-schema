import { get, relativeFileUrl } from "@hyperjump/browser";
import { toId } from "./identifiers.js";
import { definitionsOf } from "./definition-of.js";
import { isSchemaDocument } from "./schema/schema-nodes.js";
import { withValidateFormats } from "./dialects/extend-dialect.js";

/**
 * @import { Hyperjump } from "@hyperjump/browser"
 * @import { Dialect } from "./dialect.d.ts"
 * @import { JsonSchemaConfig } from "./json-schema.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema/schema-ast.d.ts"
 * @import { Id } from "./identifiers.js"
 * @import * as API from "./session.d.ts"
 */

/**
 * What a session keeps for schemas, in its state, made the first time it's
 * needed
 *
 * - `dialects` are the dialects built from meta-schemas in this session.
 * - `pendingDialects` are the dialects whose meta-schemas are being
 *   retrieved.
 * - `loading` maps the dialects whose meta-schemas are being retrieved to
 *   the dialects their meta-schemas are waiting on.
 *
 * @typedef {{
 *   dialects: Record<string, Dialect>,
 *   pendingDialects: Record<string, Promise<Dialect>>,
 *   loading: Map<Id, Set<Id>>
 * }} Schemas
 */

/** The key of a session's schemas in its state */
const schemasKey = {};

/** @type (session: Hyperjump<JsonSchemaConfig>) => Schemas */
const schemasOf = (session) => session.state(schemasKey, () => ({
  dialects: {},
  pendingDialects: {},
  loading: new Map()
}));

export { get } from "@hyperjump/browser";

/** @type typeof API.hasDialect */
export const hasDialect = (session, uri) => dialectOf(session, toId(uri)) !== undefined;

/** @type (session: Hyperjump<JsonSchemaConfig>, uri: Id) => Dialect | undefined */
const dialectOf = (session, uri) => definitionsOf(session.config).dialects[uri] ?? schemasOf(session).dialects[uri];

/** @type typeof API.getDialect */
export const getDialect = async (session, dialectUri, options = {}) => {
  const uri = toId(dialectUri);

  const dialect = dialectOf(session, uri);
  if (dialect) {
    return dialect;
  }

  if (options.referencedFrom !== undefined) {
    waitOn(session, toId(options.referencedFrom), uri);
  }

  const { pendingDialects } = schemasOf(session);
  pendingDialects[uri] ??= loadDialect(session, uri).finally(() => {
    delete pendingDialects[uri];
  });

  return pendingDialects[uri];
};

/**
 * If the reference is from a meta-schema that's being retrieved to build a
 * dialect, that dialect is waiting on the one it asked for. If that one is
 * waiting on this one, neither will ever finish.
 *
 * @type (session: Hyperjump<JsonSchemaConfig>, referencedFrom: Id, uri: Id) => void
 */
const waitOn = (session, referencedFrom, uri) => {
  const { loading } = schemasOf(session);
  const waitingOn = loading.get(referencedFrom);
  if (!waitingOn) {
    return;
  }

  if (isWaitingOn(loading, uri, referencedFrom)) {
    throw Error(`The meta-schemas for the '${relativeFileUrl(referencedFrom)}' and '${relativeFileUrl(uri)}' dialects depend on each other`);
  }
  waitingOn.add(uri);
};

/** @type (loading: Map<Id, Set<Id>>, uri: Id, target: Id, visited?: Set<Id>) => boolean */
const isWaitingOn = (loading, uri, target, visited = new Set()) => {
  if (uri === target) {
    return true;
  }

  visited.add(uri);
  for (const next of loading.get(uri) ?? []) {
    if (!visited.has(next) && isWaitingOn(loading, next, target, visited)) {
      return true;
    }
  }

  return false;
};

/** @type (session: Hyperjump<JsonSchemaConfig>, uri: Id) => Promise<Dialect> */
const loadDialect = async (session, uri) => {
  const { loading, dialects } = schemasOf(session);
  loading.set(uri, new Set());
  try {
    let metaSchema;
    try {
      metaSchema = (await get(session, uri, { reference: "manual" })).document;
    } catch (error) {
      throw Error(`Unable to retrieve the meta-schema for the '${relativeFileUrl(uri)}' dialect`, { cause: error });
    }

    if (!isSchemaDocument(metaSchema)) {
      throw Error(`The meta-schema for the '${relativeFileUrl(uri)}' dialect isn't a schema. It needs to be retrieved as 'application/schema+json' or from a '.schema.json' file.`);
    }

    const { definedDialect } = metaSchema;
    if (!definedDialect) {
      throw Error(`The meta-schema for the '${relativeFileUrl(uri)}' dialect doesn't define a dialect (with '$vocabulary', for example). Add it to the 'dialects' option of jsonSchemaConfig.`);
    }

    // The dialect is identified by whichever URI found the meta-schema
    const dialect = withValidateFormats({ ...definedDialect, uri }, definitionsOf(session.config));
    dialects[uri] = dialect;
    return dialect;
  } finally {
    loading.delete(uri);
  }
};
