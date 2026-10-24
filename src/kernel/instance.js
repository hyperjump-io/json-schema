import { jsonValue } from "@hyperjump/browser/json";

/**
 * @import { Json, JsonErrorNode, JsonNode, JsonType } from "@hyperjump/browser/json"
 * @import { InstanceOps } from "../keyword.d.ts"
 */

/**
 * @typedef {JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode} InstanceNode
 */

/**
 * Instance operations for plain JS values
 *
 * @type InstanceOps<Json>
 */
export const jsInstance = {
  typeOf: (instance) => {
    if (instance === null) {
      return "null";
    } else if (Array.isArray(instance)) {
      return "array";
    } else {
      return /** @type JsonType */ (typeof instance);
    }
  },
  value: (instance) => instance,
  length: (instance) => {
    return Array.isArray(instance) ? instance.length : Object.keys(/** @type object */ (instance)).length;
  },
  has: (instance, name) => Object.hasOwn(/** @type object */ (instance), name),
  get: (instance, key) => {
    if (Array.isArray(instance)) {
      return instance[/** @type number */ (key)];
    }

    const object = /** @type Record<string, Json> */ (instance);
    return Object.hasOwn(object, key) ? object[key] : undefined;
  },
  entries: (instance) => Object.entries(/** @type Record<string, Json> */ (instance)),
  keys: (instance) => Object.keys(/** @type Record<string, Json> */ (instance)),
  items: (instance) => /** @type Json[] */ (instance)
};

/**
 * Instance operations for JSON AST nodes. Nodes that couldn't be parsed
 * don't have a `jsonType`, so they don't have a type.
 *
 * @type InstanceOps<InstanceNode>
 */
export const astInstance = {
  typeOf: (instance) => "jsonType" in instance ? instance.jsonType : undefined,
  value: (instance) => jsonValue(/** @type JsonNode */ (instance)),
  length: (instance) => /** @type JsonNode & { children: unknown[] } */ (instance).children.length,
  has: (instance, name) => {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    return object.children.some((property) => property.children[0].value === name);
  },
  get: (instance, key) => {
    const node = /** @type JsonNode<{ type: "json" }, JsonErrorNode> */ (instance);
    if (node.jsonType === "array") {
      return node.children[/** @type number */ (key)];
    } else if (node.jsonType === "object") {
      return node.children.find((property) => property.children[0].value === key)?.children[1];
    }
  },
  entries: function* (instance) {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    for (const property of object.children) {
      yield [property.children[0].value, property.children[1]];
    }
  },
  keys: function* (instance) {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    for (const property of object.children) {
      yield /** @type InstanceNode */ (/** @type unknown */ (property.children[0]));
    }
  },
  items: (instance) => /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "array" } */ (instance).children
};
