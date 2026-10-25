import unknownKeyword, { keywordDefinitionUri } from "../../keywords/unknown.js";
import { lintRule } from "../lint-rule.js";
import { visitSchemas } from "../utilities.js";

/**
 * @import { Dialect } from "../../dialect.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaKeywordNode } from "../../schema/schema-ast.d.ts"
 * @import { UnknownKeywordOptions } from "./unknown-keyword.d.ts"
 */

const definitionsUri = "https://json-schema.org/keyword/definitions";

// `misnamed-definitions` reports these
const definitionsNames = new Set(["definitions", "$defs"]);

/**
 * The number of insertions, deletions, substitutions, and swaps of
 * neighbors that make one name the other (optimal string alignment)
 *
 * @type (a: string, b: string) => number
 */
const distance = (a, b) => {
  /** @type number[][] */
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) {
    d[0][j] = j;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
};

/**
 * The dialect's keyword a name is most likely a misspelling of, if any
 *
 * @type (name: string, dialect: Dialect) => string | undefined
 */
const closest = (name, dialect) => {
  const allowed = name.length < 5 ? 1 : 2;
  let result;
  let best = Infinity;
  for (const keywordName of ["$schema", ...Object.keys(dialect.keywords)]) {
    const candidate = distance(name.toLowerCase(), keywordName.toLowerCase());
    if (candidate <= allowed && candidate < best) {
      result = keywordName;
      best = candidate;
    }
  }
  return result;
};

/**
 * A property of a schema is an unknown keyword if it isn't in the schema's
 * dialect (`https://json-schema.org/keyword/unknown#name`).
 *
 * @type import("unified-lint-rule").Plugin<JsonSchemaDocumentNode, UnknownKeywordOptions | void>
 */
const unknownKeywordRule = lintRule({ origin: "jsonschema-lint:unknown-keyword" }, async (tree, file, options) => {
  const session = file.data.jsonSchemaSession;
  if (session === undefined) {
    return;
  }
  const ignore = new Set(options?.ignore ?? []);

  /** @type [JsonSchemaKeywordNode, string][] */
  const found = [];
  visitSchemas(tree, (schemaNode) => {
    // A draft-04–07 reference's properties aren't keywords
    if (schemaNode.type !== "json-schema" || schemaNode.jsonType !== "object") {
      return;
    }

    for (const keywordNode of /** @type JsonSchemaKeywordNode[] */ (schemaNode.children)) {
      const name = keywordNode.children[0].value;
      if (keywordDefinitionUri(keywordNode.keywordUri) === unknownKeyword.uri && name !== "$comment" && !ignore.has(name)) {
        found.push([keywordNode, schemaNode.dialectUri]);
      }
    }
  });

  /** @type Map<string, Promise<Dialect | undefined>> */
  const dialects = new Map();
  for (const [keywordNode, dialectUri] of found) {
    let dialect = dialects.get(dialectUri);
    if (dialect === undefined) {
      // A dialect that can't be found was reported when the schema was
      // resolved
      dialect = session.getDialect(dialectUri).catch(() => undefined);
      dialects.set(dialectUri, dialect);
    }

    const resolved = await dialect;
    const name = keywordNode.children[0].value;
    // The resolver reports unknown keywords where they aren't allowed, and
    // `x-` keywords are allowed there
    if (resolved === undefined || resolved.unknownKeywords === "error") {
      continue;
    } else if (definitionsNames.has(name) && Object.values(resolved.keywords).includes(definitionsUri)) {
      continue;
    }

    const suggestion = closest(name, resolved);
    const reason = `'${name}' isn't a keyword in this dialect`;
    file.message(suggestion === undefined ? reason : `${reason}. Did you mean '${suggestion}'?`, { place: keywordNode.position });
  }
});

export default unknownKeywordRule;
