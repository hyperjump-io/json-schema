import * as JsonPointer from "@hyperjump/json-pointer";
import { toAbsoluteIri } from "@hyperjump/uri";
import { appendToLocation, jsonValue, pointerGet } from "@hyperjump/browser/json";
import { keywordDefinitionUri } from "./keywords/unknown.js";

/**
 * @import { Json, JsonErrorNode } from "@hyperjump/browser/json"
 * @import { JsonSchemaSession } from "./json-schema.d.ts"
 * @import { CompileContext } from "./keyword.d.ts"
 * @import { JsonSchemaDocumentNode, JsonSchemaNode } from "./schema-ast.d.ts"
 */

/**
 * A keyword in a compiled schema. `steps` has the path from the schema to a
 * subschema the keyword compiled, by the subschema's canonical URI, for the
 * subschemas whose canonical URI isn't under the keyword's. That's one with
 * an `$id`, or one in a sibling keyword's value, like `then` for `if`.
 *
 * @typedef {[keywordUri: string, absoluteKeywordLocation: string, compiled: Json] | [keywordUri: string, absoluteKeywordLocation: string, compiled: Json, steps: Record<string, string>]} CompiledKeyword
 */

/**
 * A compiled schema is a boolean or its keywords, in the order they're
 * evaluated, and the URI of the schema resource it belongs to.
 *
 * @typedef {boolean | { resource: string; keywords: CompiledKeyword[] }} CompiledSchema
 */

/**
 * A compiled schema and everything it references. This is the IR. It's JSON
 * so it can be serialized.
 *
 * - `uri`: The schema evaluation starts from
 * - `schemas`: Every compiled schema by canonical URI
 * - `resources`: The dynamic anchors of every schema resource a compiled
 *   schema belongs to, mapped to the schemas they identify
 *
 * @typedef {{
 *   uri: string;
 *   schemas: Record<string, CompiledSchema>;
 *   resources: Record<string, { dynamicAnchors: Record<string, string> }>;
 * }} CompiledSchemas
 */

/** @type (session: JsonSchemaSession, uri: string) => Promise<CompiledSchemas> */
export const compile = async (session, uri) => {
  const compiler = new Compiler(session);
  return compiler.compile(uri);
};

class Compiler {
  /** @type JsonSchemaSession */
  #session;

  /** @type CompiledSchemas["schemas"] */
  #schemas;

  /** @type CompiledSchemas["resources"] */
  #resources;

  /**
   * @param {JsonSchemaSession} session
   */
  constructor(session) {
    this.#session = session;
    this.#schemas = {};
    this.#resources = {};
  }

  /** @type (uri: string) => Promise<CompiledSchemas> */
  async compile(uri) {
    const handle = await this.#compileUri(uri);
    return { uri: handle, schemas: this.#schemas, resources: this.#resources };
  }

  /** @type (uri: string, referencedFrom?: string) => Promise<string> */
  async #compileUri(uri, referencedFrom) {
    const node = await this.#session.get(uri, referencedFrom === undefined ? undefined : { referencedFrom });
    return this.#compileNode(node);
  }

  /** @type (node: JsonSchemaNode) => Promise<string> */
  async #compileNode(node) {
    if (node.type === "reference") {
      return this.#compileUri(node.href, toAbsoluteIri(node.location));
    } else if (node.type !== "json-schema") {
      throw Error(`No schema found at '${node.location}'`);
    }

    const handle = node.location;
    if (handle in this.#schemas) {
      return handle;
    }

    // A placeholder so schemas that refer to each other are only compiled
    // once
    this.#schemas[handle] = false;

    const resourceUri = toAbsoluteIri(handle);
    await this.#compileResource(resourceUri);

    if (node.jsonType === "boolean") {
      this.#schemas[handle] = node.value;
      return handle;
    } else if (node.jsonType !== "object") {
      throw Error(`No schema found at '${handle}'`);
    }

    const dialect = await this.#session.getDialect(node.dialectUri);

    /** @type CompiledKeyword[] */
    const keywords = [];

    /** @type CompiledKeyword[] */
    const readsEvaluated = [];

    /** @type Map<unknown, string> | undefined */
    let paths;

    for (const property of node.children) {
      const [nameNode, valueNode] = property.children;
      const keywordUri = /** @type string */ (property.keywordUri);
      const keyword = this.#session.jsonSchema.getKeyword(keywordDefinitionUri(keywordUri));
      const keywordLocation = appendToLocation(nameNode.value, handle);

      /** @type Record<string, string> | undefined */
      let steps;

      /** @type CompileContext */
      const context = {
        jsonSchema: this.#session.jsonSchema,
        schemaNode: node,
        dialect: dialect,
        keywordName: nameNode.value,
        compileSchema: async (schema) => {
          if (typeof schema === "string") {
            return this.#compileUri(schema, resourceUri);
          }

          const subschemaHandle = await this.#compileNode(schema);
          if (!subschemaHandle.startsWith(`${keywordLocation}/`)) {
            paths ??= subschemaPaths(node);
            const step = paths.get(schema);
            if (step !== undefined) {
              steps ??= {};
              steps[subschemaHandle] = step;
            }
          }

          return subschemaHandle;
        }
      };

      const compiled = keyword.compile
        ? await keyword.compile(valueNode, context)
        : jsonValue(valueNode);

      /** @type CompiledKeyword */
      const compiledKeyword = steps === undefined
        ? [keywordUri, keywordLocation, compiled]
        : [keywordUri, keywordLocation, compiled, steps];

      // Keywords that read which properties or items were evaluated have to
      // be evaluated after the keywords that evaluate them
      if (keyword.reads?.includes("evaluated")) {
        readsEvaluated.push(compiledKeyword);
      } else {
        keywords.push(compiledKeyword);
      }
    }

    this.#schemas[handle] = { resource: resourceUri, keywords: [...keywords, ...readsEvaluated] };
    return handle;
  }

  /**
   * Compile a resource's dynamic anchors. Evaluation might need them
   * whenever it enters the resource, and nothing can be retrieved then.
   *
   * @type (uri: string) => Promise<void>
   */
  async #compileResource(uri) {
    if (uri in this.#resources) {
      return;
    }

    /** @type Record<string, string> */
    const dynamicAnchors = {};
    this.#resources[uri] = { dynamicAnchors };

    const resource = /** @type JsonSchemaDocumentNode */ (await this.#session.getDocument(uri, { referencedFrom: uri }));
    const root = /** @type JsonSchemaNode */ (resource.children[0]);
    for (const name in resource.dynamicAnchors) {
      const pointer = resource.dynamicAnchors[name];
      dynamicAnchors[name] = await this.#compileNode(/** @type JsonSchemaNode */ (pointerGet(pointer, root)));
    }
  }
}

/**
 * The path from a schema to each schema in its keywords' values. Schemas are
 * where the search stops, so it only covers the keywords' own structure.
 *
 * @type (schemaNode: JsonSchemaNode & { jsonType: "object" }) => Map<unknown, string>
 */
const subschemaPaths = (schemaNode) => {
  /** @type Map<unknown, string> */
  const paths = new Map();

  /** @type (node: JsonSchemaNode | JsonErrorNode, path: string) => void */
  const walk = (node, path) => {
    if (node.type !== "json") {
      paths.set(node, path);
    } else if (node.jsonType === "array") {
      node.children.forEach((itemNode, index) => {
        walk(itemNode, JsonPointer.append(`${index}`, path));
      });
    } else if (node.jsonType === "object") {
      for (const property of node.children) {
        walk(property.children[1], JsonPointer.append(property.children[0].value, path));
      }
    }
  };
  for (const property of schemaNode.children) {
    walk(property.children[1], JsonPointer.append(property.children[0].value, ""));
  }

  return paths;
};
