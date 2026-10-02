import * as JsonPointer from "@hyperjump/json-pointer";
import { reduce } from "@hyperjump/pact";
import { toAbsoluteIri } from "@hyperjump/uri";
import { Reference } from "@hyperjump/browser/jref";
import { toAbsoluteUri, uriFragment } from "./common.js";


export const fromJs = (value, uri = "", pointer = "", parent = undefined) => {
  const jsType = typeof value;

  switch (jsType) {
    case "number":
    case "string":
    case "boolean":
      return cons(uri, pointer, value, jsType, [], parent);
    case "object":
      if (value === null) {
        return cons(uri, pointer, value, "null", [], parent);
      } else if (Array.isArray(value)) {
        const arrayNode = cons(uri, pointer, value, "array", [], parent);
        arrayNode.children = value.map((item, index) => {
          return fromJs(item, uri, JsonPointer.append(index, pointer), arrayNode);
        });
        return arrayNode;
      } else if (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null) {
        const objectNode = cons(uri, pointer, value, "object", [], parent);
        objectNode.children = Object.entries(value).map((entry) => {
          const propertyPointer = JsonPointer.append(entry[0], pointer);
          const propertyNode = cons(uri, propertyPointer, undefined, "property", [], objectNode);
          propertyNode.children[0] = fromJs(entry[0], uri, "*" + propertyPointer, propertyNode);
          propertyNode.children[1] = fromJs(entry[1], uri, propertyPointer, propertyNode);
          return propertyNode;
        });
        return objectNode;
      } else if (value instanceof Reference) {
        return fromJs(value.toJSON(), uri, pointer, parent);
      }
    default: {
      const type = jsType === "object" ? Object.getPrototypeOf(value).constructor.name || "anonymous" : jsType;
      throw Error(`Not a JSON compatible type: ${type}`);
    }
  }
};

export const fromJson = (json, uri = "") => {
  const parser = { json, uri, offset: 0 };
  skipWhitespace(parser);
  const node = parseValue(parser, "", undefined);
  skipWhitespace(parser);
  if (parser.offset < json.length) {
    throw unexpectedToken(parser);
  }

  return node;
};

const parseValue = (parser, pointer, parent) => {
  const start = parser.offset;
  const char = parser.json[start];

  switch (char) {
    case "{":
      return parseObject(parser, pointer, parent);
    case "[":
      return parseArray(parser, pointer, parent);
    case "\"":
      return parseString(parser, pointer, parent);
    case "t":
      return parseLiteral(parser, "true", true, "boolean", pointer, parent);
    case "f":
      return parseLiteral(parser, "false", false, "boolean", pointer, parent);
    case "n":
      return parseLiteral(parser, "null", null, "null", pointer, parent);
    default: {
      numberPattern.lastIndex = start;
      const match = numberPattern.exec(parser.json);
      if (!match) {
        throw unexpectedToken(parser);
      }
      parser.offset += match[0].length;
      return cons(parser.uri, pointer, Number(match[0]), "number", [], parent, start, match[0].length);
    }
  }
};

const parseObject = (parser, pointer, parent) => {
  const start = parser.offset++;
  const objectNode = cons(parser.uri, pointer, undefined, "object", [], parent, start);
  const entries = [];
  const propertyIndexes = new Map();

  skipWhitespace(parser);
  if (parser.json[parser.offset] === "}") {
    parser.offset++;
  } else {
    while (true) {
      if (parser.json[parser.offset] !== "\"") {
        throw unexpectedToken(parser);
      }

      const propertyStart = parser.offset;
      const propertyNode = cons(parser.uri, "", undefined, "property", [], objectNode, propertyStart);
      const keyNode = parseString(parser, "", propertyNode);
      const propertyPointer = JsonPointer.append(keyNode.value, pointer);
      propertyNode.pointer = propertyPointer;
      keyNode.pointer = "*" + propertyPointer;
      propertyNode.children[0] = keyNode;

      skipWhitespace(parser);
      propertyNode.colonOffset = parser.offset;
      expect(parser, ":");
      skipWhitespace(parser);

      const valueNode = parseValue(parser, propertyPointer, propertyNode);
      propertyNode.children[1] = valueNode;
      propertyNode.length = parser.offset - propertyStart;

      // Duplicate keys: like JSON.parse, the last value wins, but the property keeps its original place in the order
      if (propertyIndexes.has(keyNode.value)) {
        objectNode.children[propertyIndexes.get(keyNode.value)] = propertyNode;
      } else {
        propertyIndexes.set(keyNode.value, objectNode.children.length);
        objectNode.children.push(propertyNode);
      }
      entries.push([keyNode.value, valueNode.value]);

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

  objectNode.value = Object.fromEntries(entries);
  objectNode.length = parser.offset - start;
  return objectNode;
};

const parseArray = (parser, pointer, parent) => {
  const start = parser.offset++;
  const arrayNode = cons(parser.uri, pointer, undefined, "array", [], parent, start);

  skipWhitespace(parser);
  if (parser.json[parser.offset] === "]") {
    parser.offset++;
  } else {
    while (true) {
      const itemPointer = JsonPointer.append(arrayNode.children.length, pointer);
      arrayNode.children.push(parseValue(parser, itemPointer, arrayNode));

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

  arrayNode.value = arrayNode.children.map(value);
  arrayNode.length = parser.offset - start;
  return arrayNode;
};

const parseString = (parser, pointer, parent) => {
  const start = parser.offset;
  stringPattern.lastIndex = start;
  const match = stringPattern.exec(parser.json);
  if (!match) {
    throw unexpectedToken(parser);
  }

  // Raw control characters and invalid escapes are rejected here
  let stringValue;
  try {
    stringValue = JSON.parse(match[0]);
  } catch (_error) {
    throw unexpectedToken(parser, "Invalid string");
  }

  parser.offset += match[0].length;
  return cons(parser.uri, pointer, stringValue, "string", [], parent, start, match[0].length);
};

const parseLiteral = (parser, literal, literalValue, type, pointer, parent) => {
  const start = parser.offset;
  if (!parser.json.startsWith(literal, start)) {
    throw unexpectedToken(parser);
  }

  parser.offset += literal.length;
  return cons(parser.uri, pointer, literalValue, type, [], parent, start, literal.length);
};

const numberPattern = /-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/y;
const stringPattern = /"(?:[^"\\]|\\.)*"/ys;
const whitespacePattern = /[ \t\n\r]*/y;

const skipWhitespace = (parser) => {
  whitespacePattern.lastIndex = parser.offset;
  whitespacePattern.exec(parser.json);
  parser.offset = whitespacePattern.lastIndex;
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
  const node = {
    baseUri: baseUri ? toAbsoluteIri(baseUri) : "",
    pointer: pointer,
    value: value,
    type: type,
    children: children,
    parent: parent,
    offset: offset,
    length: length,
    colonOffset: colonOffset,
    annotations: {}
  };
  node.root = parent?.root ?? node;

  return node;
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
