import { jsonValue } from "@hyperjump/browser/json";

/**
 * @import { Json, JsonErrorNode, JsonNode, JsonType } from "@hyperjump/browser/json"
 * @import { InstanceOps } from "../keyword.d.ts"
 */

/**
 * @typedef {JsonNode<{ type: "json" }, JsonErrorNode> | JsonErrorNode} InstanceNode
 */

// The instance operations are classes, not object literals. Literals with
// the same properties share a hidden class, so a call like `ops.typeOf`
// that sees both would have no known target, and V8 couldn't inline it.
// With a prototype each, it can inline both. Evaluating ASTs made
// evaluating plain values with plugins about 20% slower without it. The
// methods don't use `this`, so they can be called on their own.

/**
 * Instance operations for plain JS values
 *
 * @implements InstanceOps<Json>
 */
class JsInstance {
  /** @type InstanceOps<Json>["typeOf"] */
  typeOf(instance) {
    if (instance === null) {
      return "null";
    } else if (Array.isArray(instance)) {
      return "array";
    } else {
      return /** @type JsonType */ (typeof instance);
    }
  }

  /** @type InstanceOps<Json>["value"] */
  value(instance) {
    return instance;
  }

  /** @type InstanceOps<Json>["length"] */
  length(instance) {
    return Array.isArray(instance) ? instance.length : Object.keys(/** @type object */ (instance)).length;
  }

  /** @type InstanceOps<Json>["has"] */
  has(instance, name) {
    return Object.hasOwn(/** @type object */ (instance), name);
  }

  /** @type InstanceOps<Json>["get"] */
  get(instance, key) {
    if (Array.isArray(instance)) {
      return instance[/** @type number */ (key)];
    }

    const object = /** @type Record<string, Json> */ (instance);
    return Object.hasOwn(object, key) ? object[key] : undefined;
  }

  /** @type InstanceOps<Json>["entries"] */
  entries(instance) {
    return Object.entries(/** @type Record<string, Json> */ (instance));
  }

  /** @type InstanceOps<Json>["keys"] */
  keys(instance) {
    return Object.keys(/** @type Record<string, Json> */ (instance));
  }

  /** @type InstanceOps<Json>["items"] */
  items(instance) {
    return /** @type Json[] */ (instance);
  }
}

/** @type InstanceOps<Json> */
export const jsInstance = new JsInstance();

/**
 * Instance operations for JSON AST nodes. Nodes that couldn't be parsed
 * don't have a `jsonType`, so they don't have a type.
 *
 * @implements InstanceOps<InstanceNode>
 */
class AstInstance {
  /** @type InstanceOps<InstanceNode>["typeOf"] */
  typeOf(instance) {
    return "jsonType" in instance ? instance.jsonType : undefined;
  }

  /** @type InstanceOps<InstanceNode>["value"] */
  value(instance) {
    return jsonValue(/** @type JsonNode */ (instance));
  }

  /** @type InstanceOps<InstanceNode>["length"] */
  length(instance) {
    return /** @type JsonNode & { children: unknown[] } */ (instance).children.length;
  }

  /** @type InstanceOps<InstanceNode>["has"] */
  has(instance, name) {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    return object.children.some((property) => property.children[0].value === name);
  }

  /** @type InstanceOps<InstanceNode>["get"] */
  get(instance, key) {
    const node = /** @type JsonNode<{ type: "json" }, JsonErrorNode> */ (instance);
    if (node.jsonType === "array") {
      return node.children[/** @type number */ (key)];
    } else if (node.jsonType === "object") {
      return node.children.find((property) => property.children[0].value === key)?.children[1];
    }
  }

  /** @type InstanceOps<InstanceNode>["entries"] */
  * entries(instance) {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    for (const property of object.children) {
      yield [property.children[0].value, property.children[1]];
    }
  }

  /** @type InstanceOps<InstanceNode>["keys"] */
  * keys(instance) {
    const object = /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "object" } */ (instance);
    for (const property of object.children) {
      yield /** @type InstanceNode */ (/** @type unknown */ (property.children[0]));
    }
  }

  /** @type InstanceOps<InstanceNode>["items"] */
  items(instance) {
    return /** @type JsonNode<{ type: "json" }, JsonErrorNode> & { jsonType: "array" } */ (instance).children;
  }
}

/** @type InstanceOps<InstanceNode> */
export const astInstance = new AstInstance();
