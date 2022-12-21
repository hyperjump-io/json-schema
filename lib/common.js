import URI from "uri-js";


const isObject = (value) => typeof value === "object" && !Array.isArray(value) && value !== null;
const isType = {
  null: (value) => value === null,
  boolean: (value) => typeof value === "boolean",
  object: isObject,
  array: (value) => Array.isArray(value),
  number: (value) => typeof value === "number",
  integer: (value) => Number.isInteger(value),
  string: (value) => typeof value === "string"
};
export const jsonTypeOf = (value, type) => isType[type](value);

export const resolveUrl = (contextUrl, url) => {
  const resolvedUrl = URI.resolve(contextUrl, url, { iri: true });
  const contextId = URI.resolve(contextUrl, "", { iri: true });
  if (contextId && URI.parse(resolvedUrl).scheme === "file" && URI.parse(contextUrl).scheme !== "file") {
    throw Error(`Can't access file '${resolvedUrl}' resource from network context '${contextUrl}'`);
  }
  return resolvedUrl;
};

export const urlFragment = (url) => URI.unescapeComponent(URI.parse(url).fragment) || "";

const CHAR_BACKWARD_SLASH = 47;

export const pathRelative = (from, to) => {
  if (from === to) {
    return "";
  }

  let toStart = 1;
  const fromLen = from.length - 1;
  const toLen = to.length - toStart;

  // Compare paths to find the longest common path from root
  const length = fromLen < toLen ? fromLen : toLen;
  let lastCommonSep = -1;
  let i = 0;
  for (; i < length; i++) {
    const fromCode = from.charCodeAt(i + 1);
    if (fromCode !== to.charCodeAt(toStart + i)) {
      break;
    } else if (fromCode === CHAR_BACKWARD_SLASH) {
      lastCommonSep = i;
    }
  }

  if (toLen > length) {
    if (to.charCodeAt(toStart + i) === CHAR_BACKWARD_SLASH) {
      return to.slice(toStart + i + 1);
    }
    if (i === 0) {
      return to.slice(toStart + i);
    }
  }
  if (fromLen > length) {
    if (from.charCodeAt(i + 1) === CHAR_BACKWARD_SLASH) {
      lastCommonSep = i;
    } else if (length === 0) {
      lastCommonSep = 0;
    }
  }

  let out = "";
  // Generate the relative path based on the path difference between `to` and `from`
  for (i = lastCommonSep + 2; i <= from.length; ++i) {
    if (i === from.length || from.charCodeAt(i) === CHAR_BACKWARD_SLASH) {
      out += out.length === 0 ? ".." : "/..";
    }
  }

  toStart += lastCommonSep;

  // Lastly, append the rest of the destination (`to`) path that comes after
  // the common path parts
  if (out.length > 0) {
    return `${out}${to.slice(toStart, to.length)}`;
  }

  if (to.charCodeAt(toStart) === CHAR_BACKWARD_SLASH) {
    ++toStart;
  }

  return to.slice(toStart, to.length);
};
