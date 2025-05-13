import * as JsonPointer from "@hyperjump/json-pointer";
import { reduce } from "@hyperjump/pact";
import { Reference } from "@hyperjump/browser/jref";
import { toAbsoluteUri, uriFragment } from "./common.js";


export const fromJs = (js, baseUri = "", pointer = "") => {
  if (js instanceof Reference) {
    return fromJs(js.toJSON(), baseUri, pointer);
  }

  const node = {
    type: "json",
    baseUri: baseUri,
    pointer: pointer,
    annotations: {}
  };

  const jsonType = typeof js;
  switch (jsonType) {
    case "boolean":
    case "number":
    case "string":
      node.jsonType = jsonType;
      node.value = js;
      break;

    case "object":
      if (js === null) {
        node.jsonType = "null";
        node.value = js;
        break;
      }

      if (Array.isArray(js)) {
        node.jsonType = "array";
        node.children = js.map((item, index) => {
          return fromJs(item, baseUri, JsonPointer.append(index, pointer));
        });
        break;
      }

      if (Object.getPrototypeOf(js) === Object.prototype) {
        /** @type JsonPropertyNode[] */
        const properties = [];
        for (const key in js) {
          const propertyPointer = JsonPointer.append(key, pointer);
          properties.push({
            type: "json-property",
            children: [
              {
                type: "json-property-name",
                jsonType: "string",
                value: key,
                annotations: {}
              },
              fromJs(js[key], baseUri, propertyPointer)
            ]
          });
        }

        node.jsonType = "object";
        node.children = properties;
        break;
      }

      throw TypeError(`Not a JSON compatible type: ${js.constructor?.name ?? "*anonymous*"}`);

    default:
      throw TypeError(`Not a JSON compatible type: ${typeof js}`);
  }

  return node;
};

export const get = (uri, instance) => {
  const schemaId = toAbsoluteUri(uri);
  if (schemaId !== instance.baseUri && schemaId !== "") {
    throw Error(`Reference '${uri}' is not local to '${instance.baseUri}'`);
  }

  let pointer = uriFragment(uri);

  return reduce((node, segment) => {
    segment = segment === "-" && typeOf(node) === "array" ? length(node) : segment;
    return step(segment, node);
  }, instance, JsonPointer.pointerSegments(pointer));
};

export const uri = (node) => `${node.baseUri}#${encodeURI(node.pointer)}`;

export const value = (node) => {
  switch (node.jsonType) {
    case "object": {
      const object = {};
      for (const property of node.children) {
        object[value(property.children[0])] = value(property.children[1]);
      }
      return object;
    }
    case "array":
      return node.children.map(value);
    default:
      return node.value;
  }
};

export const typeOf = (node) => node.jsonType;

export const has = (key, node) => {
  if (node.jsonType !== "object") {
    return false;
  }

  for (const property of node.children) {
    if (property.children[0].value === key) {
      return true;
    }
  }

  return false;
};

export const step = (key, node) => {
  switch (node.jsonType) {
    case "object": {
      const property = node.children.find((propertyNode) => {
        return value(propertyNode.children[0]) === key;
      });
      return property?.children[1];
    }
    case "array": {
      const index = parseInt(key, 10);
      return node.children[index];
    }
    default:
      return;
  }
};

export const iter = function* (node) {
  if (node.jsonType !== "array") {
    return;
  }

  yield* node.children;
};

export const keys = function* (node) {
  if (node.jsonType !== "object") {
    return;
  }

  for (const property of node.children) {
    yield property.children[0];
  }
};

export const values = function* (node) {
  if (node.jsonType !== "object") {
    return;
  }

  for (const property of node.children) {
    if (property.children[1]) {
      yield property.children[1];
    }
  }
};

export const entries = function* (node) {
  if (node.jsonType !== "object") {
    return;
  }

  for (const property of node.children) {
    if (property.children.length === 2) {
      yield property.children;
    }
  }
};

export const length = (node) => {
  if (node.jsonType !== "array") {
    return;
  }

  return node.children.length;
};

export const allNodes = function* (node) {
  yield node;

  switch (typeOf(node)) {
    case "object":
      for (const child of values(node)) {
        yield* allNodes(child);
      }
      break;
    case "array":
      for (const child of iter(node)) {
        yield* allNodes(child);
      }
      break;
  }
};
