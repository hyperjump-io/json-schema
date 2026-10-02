import { parseIriReference, parseAbsoluteIri } from "@hyperjump/uri";
import * as JsonPointer from "@hyperjump/json-pointer";


// Equivalent to { ...resourceAnchors, ...dynamicAnchors }, but this runs every time a schema is evaluated, so it
// avoids creating a new object in the common case where the resource doesn't add any anchors that aren't already in
// scope. Dynamic anchor objects are never modified, so they can be shared.
// Looking up metaData by toAbsoluteUri(url) for every schema evaluation is slow because it creates a new string
// that has to be hashed every time. Caching by url is much faster because url strings come from the AST and V8 caches
// their hash.
const resourceDynamicAnchorsCache = new WeakMap();
export const resourceDynamicAnchors = (url, ast) => {
  let cache = resourceDynamicAnchorsCache.get(ast);
  if (cache === undefined) {
    cache = new Map();
    resourceDynamicAnchorsCache.set(ast, cache);
  }

  let anchors = cache.get(url);
  if (anchors === undefined) {
    anchors = ast.metaData[toAbsoluteUri(url)].dynamicAnchors;
    cache.set(url, anchors);
  }

  return anchors;
};

export const addDynamicAnchors = (resourceAnchors, dynamicAnchors) => {
  if (dynamicAnchors === undefined) {
    return resourceAnchors;
  }

  for (const anchor in resourceAnchors) {
    if (!Object.hasOwn(dynamicAnchors, anchor)) {
      return { ...resourceAnchors, ...dynamicAnchors };
    }
  }

  return dynamicAnchors;
};

export const jsonTypeOf = (value) => {
  const jsType = typeof value;

  switch (jsType) {
    case "number":
    case "string":
    case "boolean":
    case "undefined":
      return jsType;
    case "object":
      if (Array.isArray(value)) {
        return "array";
      } else if (value === null) {
        return "null";
      } else if (Object.getPrototypeOf(value) === Object.prototype) {
        return "object";
      }
    default: {
      const type = jsType === "object" ? Object.getPrototypeOf(value).constructor.name || "anonymous" : jsType;
      throw Error(`Not a JSON compatible type: ${type}`);
    }
  }
};

export const toAbsoluteUri = (uri) => {
  const position = uri.indexOf("#");
  const end = position === -1 ? uri.length : position;
  return uri.slice(0, end);
};

export const uriFragment = (uri) => decodeURIComponent(parseIriReference(uri).fragment || "");

export const toRelativeIri = (from, to) => {
  const fromUri = parseAbsoluteIri(from);
  const toUri = parseAbsoluteIri(to);

  if (toUri.scheme !== fromUri.scheme) {
    return to;
  }

  if (toUri.authority !== fromUri.authority) {
    return to;
  }

  if (from === to) {
    return "";
  }

  const fromSegments = fromUri.path.split("/");
  const toSegments = toUri.path.split("/");

  let position = 0;
  while (fromSegments[position] === toSegments[position] && position < fromSegments.length - 1 && position < toSegments.length - 1) {
    position++;
  }

  const segments = [];
  for (let index = position + 1; index < fromSegments.length; index++) {
    segments.push("..");
  }

  for (let index = position; index < toSegments.length; index++) {
    segments.push(toSegments[index]);
  }

  return segments.join("/");
};

const defaultReplacer = (_key, value) => value;
export const jsonStringify = (value, replacer = defaultReplacer, space = "") => {
  return stringifyValue(value, replacer, space, "", JsonPointer.nil, 1);
};

const stringifyValue = (value, replacer, space, key, pointer, depth) => {
  value = replacer(key, value, pointer);
  let result;
  if (Array.isArray(value)) {
    result = stringifyArray(value, replacer, space, pointer, depth);
  } else if (typeof value === "object" && value !== null) {
    result = stringifyObject(value, replacer, space, pointer, depth);
  } else {
    result = JSON.stringify(value);
  }

  return result;
};

const stringifyArray = (value, replacer, space, pointer, depth) => {
  if (value.length === 0) {
    return "[]";
  }

  const padding = space ? `\n${space.repeat(depth - 1)}` : "";

  let result = "[" + padding + space;
  for (let index = 0; index < value.length; index++) {
    const indexPointer = JsonPointer.append(index, pointer);
    const stringifiedValue = stringifyValue(value[index], replacer, space, String(index), indexPointer, depth + 1);
    result += stringifiedValue === undefined ? "null" : stringifiedValue;
    if (index + 1 < value.length) {
      result += `,${padding}${space}`;
    }
  }
  return result + padding + "]";
};

const stringifyObject = (value, replacer, space, pointer, depth) => {
  const entries = Object.entries(value);
  if (entries.length === 0) {
    return "{}";
  }

  const padding = space ? `\n${space.repeat(depth - 1)}` : "";
  const colonSpacing = space ? " " : "";

  let result = "{" + padding + space;
  let first = true;
  for (const [key, value] of entries) {
    const keyPointer = JsonPointer.append(key, pointer);
    const stringifiedValue = stringifyValue(value, replacer, space, key, keyPointer, depth + 1);
    if (stringifiedValue !== undefined) {
      if (!first) {
        result += `,${padding}${space}`;
      }
      first = false;
      result += JSON.stringify(key) + ":" + colonSpacing + stringifiedValue;
    }
  }

  return first ? "{}" : result + padding + "}";
};
