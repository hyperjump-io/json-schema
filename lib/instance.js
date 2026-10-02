import * as JsonPointer from "@hyperjump/json-pointer";
import { reduce } from "@hyperjump/pact";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Reference } from "@hyperjump/browser/jref";
import { toAbsoluteUri, uriFragment } from "./common.js";


export const fromJs = (value, uri = "", pointer = "", parent = undefined) => {
  // Normalize the base URI once rather than for every node
  return buildFromJs(value, uri ? toAbsoluteIri(uri) : "", pointer, parent, undefined);
};

// Pointers are left undefined so they can be computed lazily (see JsonNode). Array items get their index instead.
const buildFromJs = (value, baseUri, pointer, parent, index) => {
  const jsType = typeof value;

  switch (jsType) {
    case "number":
    case "string":
    case "boolean":
      return new JsonNode(baseUri, pointer, value, jsType, [], parent, index);
    case "object":
      if (value === null) {
        return new JsonNode(baseUri, pointer, value, "null", [], parent, index);
      } else if (Array.isArray(value)) {
        const children = new Array(value.length);
        const arrayNode = new JsonNode(baseUri, pointer, value, "array", children, parent, index);
        for (let itemIndex = 0; itemIndex < value.length; itemIndex++) {
          children[itemIndex] = buildFromJs(value[itemIndex], baseUri, undefined, arrayNode, itemIndex);
        }
        return arrayNode;
      } else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
        const propertyNames = Object.keys(value);
        const children = new Array(propertyNames.length);
        const objectNode = new JsonNode(baseUri, pointer, value, "object", children, parent, index);
        for (let propertyIndex = 0; propertyIndex < propertyNames.length; propertyIndex++) {
          const propertyName = propertyNames[propertyIndex];
          const propertyChildren = [undefined, undefined];
          const propertyNode = new JsonNode(baseUri, undefined, undefined, "property", propertyChildren, objectNode);
          propertyChildren[0] = new JsonNode(baseUri, undefined, propertyName, "string", [], propertyNode);
          propertyChildren[1] = buildFromJs(value[propertyName], baseUri, undefined, propertyNode, undefined);
          children[propertyIndex] = propertyNode;
        }
        return objectNode;
      } else if (value instanceof Reference) {
        return buildFromJs(value.toJSON(), baseUri, pointer, parent, index);
      }
    default: {
      const type = jsType === "object" ? Object.getPrototypeOf(value).constructor.name || "anonymous" : jsType;
      throw Error(`Not a JSON compatible type: ${type}`);
    }
  }
};

// Same as JsonPointer.append, but skips the regex replacements in the common case where there's nothing to escape
const escapePointerSegment = (segment) => {
  return segment.includes("~") || segment.includes("/")
    ? segment.replaceAll("~", "~0").replaceAll("/", "~1")
    : segment;
};

export const fromJson = (json, uri = "") => {
  // The native JSON.parse is much faster at building values than anything we can do in JS, so we use it to get the
  // value and then walk the text in parallel to build the nodes with location data. If JSON.parse fails, we parse
  // without a value to get an error that includes the location.
  let value;
  try {
    value = JSON.parse(json);
  } catch (error) {
    parse(json, uri, undefined);
    throw error;
  }

  return parse(json, uri, value);
};

const parse = (json, uri, value) => {
  const parser = { json, uri: uri ? toAbsoluteIri(uri) : "", offset: 0 };
  skipWhitespace(parser);
  const node = parseValue(parser, undefined, undefined, value);
  skipWhitespace(parser);
  if (parser.offset < json.length) {
    throw unexpectedToken(parser);
  }

  return node;
};

// The value is the corresponding value from JSON.parse (or undefined if JSON.parse failed)
const parseValue = (parser, parent, index, value) => {
  const start = parser.offset;
  const char = parser.json[start];

  switch (char) {
    case "{":
      return parseObject(parser, parent, index, value);
    case "[":
      return parseArray(parser, parent, index, value);
    case "\"":
      return parseString(parser, parent, index, value);
    case "t":
      return parseLiteral(parser, "true", true, "boolean", parent, index);
    case "f":
      return parseLiteral(parser, "false", false, "boolean", parent, index);
    case "n":
      return parseLiteral(parser, "null", null, "null", parent, index);
    default: {
      numberPattern.lastIndex = start;
      if (!numberPattern.test(parser.json)) {
        throw unexpectedToken(parser);
      }
      parser.offset = numberPattern.lastIndex;
      const numberValue = typeof value === "number" ? value : Number(parser.json.slice(start, parser.offset));
      return new JsonNode(parser.uri, undefined, numberValue, "number", [], parent, index, start, parser.offset - start);
    }
  }
};

const parseObject = (parser, parent, index, objectValue) => {
  const start = parser.offset++;
  const propertyNames = typeof objectValue === "object" && objectValue !== null ? Object.keys(objectValue) : [];
  const children = new Array(propertyNames.length);
  const objectNode = new JsonNode(parser.uri, undefined, objectValue, "object", children, parent, index, start);
  let propertyCount = 0;

  skipWhitespace(parser);
  if (parser.json[parser.offset] === "}") {
    parser.offset++;
  } else {
    while (true) {
      if (parser.json[parser.offset] !== "\"") {
        throw unexpectedToken(parser);
      }

      const propertyStart = parser.offset;
      const propertyNode = new JsonNode(parser.uri, undefined, undefined, "property", [undefined, undefined], objectNode, undefined, propertyStart);
      // Using the property name string from the value (when it matches) makes the value lookup below much faster
      const keyNode = parseString(parser, propertyNode, undefined, propertyNames[propertyCount]);
      propertyNode.children[0] = keyNode;

      skipWhitespace(parser);
      propertyNode.colonOffset = parser.offset;
      expect(parser, ":");
      skipWhitespace(parser);

      const valueNode = parseValue(parser, propertyNode, undefined, objectValue?.[keyNode.value]);
      propertyNode.children[1] = valueNode;
      propertyNode.length = parser.offset - propertyStart;

      children[propertyCount++] = propertyNode;

      skipWhitespace(parser);
      if (parser.json[parser.offset] === ",") {
        parser.offset++;
        skipWhitespace(parser);
      } else {
        expect(parser, "}");
        break;
      }
    }
  }

  // More properties in the text than keys in the value means there were duplicate keys
  if (propertyCount !== propertyNames.length) {
    children.length = propertyCount;
    objectNode.children = removeDuplicateProperties(children);
  }

  objectNode.length = parser.offset - start;
  return objectNode;
};

// Like JSON.parse, the last value wins, but the property keeps its original place in the order. Nodes under the
// overwritten properties are discarded, so it doesn't matter that their values don't line up with JSON.parse's value.
const removeDuplicateProperties = (properties) => {
  const propertyIndexes = new Map();
  const result = [];
  for (const property of properties) {
    const propertyName = property.children[0].value;
    if (propertyIndexes.has(propertyName)) {
      result[propertyIndexes.get(propertyName)] = property;
    } else {
      propertyIndexes.set(propertyName, result.length);
      result.push(property);
    }
  }

  return result;
};

const parseArray = (parser, parent, index, arrayValue) => {
  const start = parser.offset++;
  const children = new Array(Array.isArray(arrayValue) ? arrayValue.length : 0);
  const arrayNode = new JsonNode(parser.uri, undefined, arrayValue, "array", children, parent, index, start);
  let itemCount = 0;

  skipWhitespace(parser);
  if (parser.json[parser.offset] === "]") {
    parser.offset++;
  } else {
    while (true) {
      children[itemCount] = parseValue(parser, arrayNode, itemCount, arrayValue?.[itemCount]);
      itemCount++;

      skipWhitespace(parser);
      if (parser.json[parser.offset] === ",") {
        parser.offset++;
        skipWhitespace(parser);
      } else {
        expect(parser, "]");
        break;
      }
    }
  }

  // Normally a no-op. Under a duplicate property that gets discarded, arrayValue might not match the text.
  children.length = itemCount;

  arrayNode.length = parser.offset - start;
  return arrayNode;
};

const parseString = (parser, parent, index, expected) => {
  const start = parser.offset;
  const json = parser.json;

  // Fast path: most strings have no escapes, so the value is just the text between the quotes
  plainStringPattern.lastIndex = start;
  if (plainStringPattern.test(json)) {
    const end = plainStringPattern.lastIndex;
    parser.offset = end;
    const stringValue = typeof expected === "string" && expected.length === end - start - 2 && json.startsWith(expected, start + 1)
      ? expected
      : json.slice(start + 1, end - 1);
    return new JsonNode(parser.uri, undefined, stringValue, "string", [], parent, index, start, end - start);
  }

  // Raw control characters and invalid escapes are rejected here
  stringPattern.lastIndex = start;
  if (!stringPattern.test(json)) {
    throw unexpectedToken(parser, "Invalid string");
  }

  const end = stringPattern.lastIndex;
  parser.offset = end;
  return new JsonNode(parser.uri, undefined, JSON.parse(json.slice(start, end)), "string", [], parent, index, start, end - start);
};

const parseLiteral = (parser, literal, literalValue, type, parent, index) => {
  const start = parser.offset;
  if (!parser.json.startsWith(literal, start)) {
    throw unexpectedToken(parser);
  }

  parser.offset += literal.length;
  return new JsonNode(parser.uri, undefined, literalValue, type, [], parent, index, start, literal.length);
};

const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
// JSON doesn't allow raw control characters in strings
/* eslint-disable no-control-regex */
const plainStringPattern = /"[^"\\\x00-\x1f]*"/y;
const stringPattern = /"[^"\\\x00-\x1f]*(?:\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4})[^"\\\x00-\x1f]*)*"/y;
/* eslint-enable no-control-regex */

const skipWhitespace = (parser) => {
  const json = parser.json;
  let offset = parser.offset;
  while (true) {
    const charCode = json.charCodeAt(offset);
    if (charCode !== 32 /* space */ && charCode !== 10 /* \n */ && charCode !== 13 /* \r */ && charCode !== 9 /* \t */) {
      break;
    }
    offset++;
  }
  parser.offset = offset;
};

const expect = (parser, char) => {
  if (parser.json[parser.offset] !== char) {
    throw unexpectedToken(parser, `Expected '${char}'`);
  }
  parser.offset++;
};

const unexpectedToken = (parser, message = undefined) => {
  const found = parser.offset < parser.json.length ? `'${parser.json[parser.offset]}'` : "end of input";
  return SyntaxError(`${message ?? "Unexpected token"}: found ${found} at offset ${parser.offset}`);
};

export const cons = (baseUri, pointer, value, type, children, parent, offset = undefined, length = undefined, colonOffset = undefined) => {
  return new JsonNode(baseUri ? toAbsoluteIri(baseUri) : "", pointer, value, type, children, parent, undefined, offset, length, colonOffset);
};

// Expects an already normalized baseUri. Building pointers for every node is expensive and most of them are never
// used, so if no pointer is given, it's computed from the parent's pointer the first time it's needed. The
// annotations object is also created on first use.
class JsonNode {
  #pointer;
  #index;
  #annotations;

  constructor(baseUri, pointer, value, type, children, parent, index = undefined, offset = undefined, length = undefined, colonOffset = undefined) {
    this.baseUri = baseUri;
    this.#pointer = pointer;
    this.#index = index;
    this.value = value;
    this.type = type;
    this.children = children;
    this.parent = parent;
    this.root = parent === undefined ? this : parent.root;
    this.offset = offset;
    this.length = length;
    this.colonOffset = colonOffset;
  }

  get pointer() {
    return this.#pointer ??= computePointer(this, this.#index);
  }

  set pointer(pointer) {
    this.#pointer = pointer;
  }

  get annotations() {
    return this.#annotations ??= {};
  }

  set annotations(annotations) {
    this.#annotations = annotations;
  }
}

const computePointer = (node, index) => {
  const parent = node.parent;
  if (parent === undefined) {
    return "";
  } else if (node.type === "property") {
    return parent.pointer + "/" + escapePointerSegment(node.children[0].value);
  } else if (parent.type === "property") {
    return parent.children[0] === node ? "*" + parent.pointer : parent.pointer;
  } else {
    return parent.pointer + "/" + index;
  }
};

export const get = (uri, instance) => {
  const schemaId = toAbsoluteUri(uri);
  if (schemaId !== instance.baseUri && schemaId !== "") {
    throw Error(`Reference '${uri}' is not local to '${instance.baseUri}'`);
  }

  let isPropertyNamePointer = false;
  let pointer = uriFragment(uri);
  if (pointer.startsWith("*")) {
    pointer = pointer.slice(1);
    isPropertyNamePointer = true;
  }

  const result = reduce((node, segment) => {
    segment = segment === "-" && typeOf(node) === "array" ? length(node) : segment;
    return step(segment, node);
  }, instance.root, JsonPointer.pointerSegments(pointer));

  return isPropertyNamePointer ? result.parent.children[0] : result;
};

export const uri = (node) => `${node.baseUri}#${encodeURI(node.pointer)}`;
export const value = (node) => node.value;
export const typeOf = (node) => node.type;
export const has = (key, node) => Object.hasOwn(node.value, key);

export const step = (key, node) => {
  switch (node.type) {
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
  if (node.type !== "array") {
    return;
  }

  yield* node.children;
};

export const keys = function* (node) {
  if (node.type !== "object") {
    return;
  }

  for (const property of node.children) {
    yield property.children[0];
  }
};

export const values = function* (node) {
  if (node.type !== "object") {
    return;
  }

  for (const property of node.children) {
    if (property.children[1]) {
      yield property.children[1];
    }
  }
};

export const entries = function* (node) {
  if (node.type !== "object") {
    return;
  }

  for (const property of node.children) {
    if (property.children.length === 2) {
      yield property.children;
    }
  }
};

export const length = (node) => {
  if (node.type !== "array") {
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
