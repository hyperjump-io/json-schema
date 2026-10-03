import contentTypeParser from "content-type";
import { get as browserGet } from "@hyperjump/browser";
import { Reference } from "@hyperjump/browser/jref";
import { append } from "@hyperjump/json-pointer";
import { resolveIri, toAbsoluteIri, normalizeIri } from "@hyperjump/uri";
import { getKeywordName, loadDialect, unloadDialect } from "./keywords.js";
import { uriFragment, jsonStringify, jsonTypeOf, toRelativeIri } from "./common.js";


export const schemaPlugin = {
  parse: async (response) => {
    const contentType = contentTypeParser.parse(response.headers.get("content-type") ?? "");
    const contextDialectId = contentType.parameters.schema ?? contentType.parameters.profile;

    return buildSchemaDocument(await response.json(), response.url, contextDialectId);
  },
  fileMatcher: async (path) => /(\.|\/)schema\.json$/.test(path)
};

const schemaRegistry = {};

export const getSchema = async (uri, browser = undefined) => {
  if (!browser) {
    browser = { _cache: {} };
  }

  for (const uri in schemaRegistry) {
    if (!(uri in browser._cache)) {
      browser._cache[uri] = schemaRegistry[uri];
    }
  }

  const schema = await browserGet(uri, { ...browser });
  if (typeof schema.document.dialectId !== "string") {
    throw Error(`The document at ${schema.document.baseUri} is not a schema.`);
  }

  return schema;
};

export const registerSchema = (schema, retrievalUri, contextDialectId) => {
  const document = buildSchemaDocument(schema, retrievalUri, contextDialectId);

  if (document.baseUri in schemaRegistry) {
    throw Error(`A schema has already been registered for '${document.baseUri}. You can use 'unregisterSchema' to remove the old schema before registering the new one.`);
  }

  if (document.baseUri.startsWith("file:")) {
    throw Error(`Registering a schema with a 'file:' URI scheme is not allowed: ${document.baseUri}`);
  }

  schemaRegistry[retrievalUri ? toAbsoluteIri(retrievalUri) : document.baseUri] = document;
};

export const unregisterSchema = (uri) => {
  const normalizedUri = toAbsoluteIri(uri);
  unloadDialect(normalizedUri);
  delete schemaRegistry[normalizedUri];
};

export const getAllRegisteredSchemaUris = () => Object.keys(schemaRegistry);

export const hasSchema = (uri) => uri in schemaRegistry;

// Builds a new document from the schema without modifying it
export const buildSchemaDocument = (schema, id, dialectId, embedded = {}) => {
  // The root's identifying keywords are removed below, so they're removed from a shallow copy. The rest of the schema
  // is copied as it's processed.
  schema = toPlainJson(schema);
  if (typeof schema === "object" && schema !== null && !Array.isArray(schema)) {
    schema = { ...schema };
  }

  // Dialect / JSON Schema Version
  if (typeof schema.$schema === "string") {
    dialectId = schema.$schema;
    delete schema.$schema;
  }

  if (!dialectId) {
    throw Error("Unable to determine a dialect for the schema. The dialect can be declared in a number of ways, but the recommended way is to use the '$schema' keyword in your schema.");
  }
  dialectId = normalizeDialectId(dialectId);

  // Identifiers
  const legacyIdToken = getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/id");
  const idToken = getKeywordName(dialectId, "https://json-schema.org/keyword/id") || legacyIdToken;
  if (!schema[idToken] && !id) {
    throw Error(`Unable to determine an identifier for the schema. Use the '${idToken}' keyword or pass a retrievalUri when loading the schema.`);
  }
  const resolvedId = resolveIri(schema[idToken] ?? "", id ?? "");
  id = toAbsoluteIri(resolvedId);
  if (legacyIdToken && resolvedId.length > id.length) {
    schema[idToken] = "#" + uriFragment(resolvedId);
  } else {
    delete schema[idToken];
  }

  // Vocabulary
  const vocabularyToken = getKeywordName(dialectId, "https://json-schema.org/keyword/vocabulary");
  if (jsonTypeOf(schema[vocabularyToken]) === "object") {
    const allowUnknownKeywords = schema[vocabularyToken]["https://json-schema.org/draft/2019-09/vocab/core"]
      || schema[vocabularyToken]["https://json-schema.org/draft/2020-12/vocab/core"];

    loadDialect(id, schema[vocabularyToken], allowUnknownKeywords, false);
    delete schema[vocabularyToken];
  }

  const anchors = { "": "" };
  const dynamicAnchors = {};

  // Legacy Recursive anchor
  const recursiveAnchorToken = getKeywordName(dialectId, "https://json-schema.org/keyword/draft-2019-09/recursiveAnchor");
  if (schema[recursiveAnchorToken] === true) {
    dynamicAnchors[""] = `${id}#`;
  }
  delete schema[recursiveAnchorToken];

  embedded[id] = {
    baseUri: id,
    dialectId: dialectId,
    root: processSchema(schema, id, dialectId, "", embedded, anchors, dynamicAnchors),
    anchorLocation: (fragment) => {
      if (fragment === undefined) {
        return "";
      }

      fragment = decodeURI(fragment);
      if (fragment[0] === "/") {
        return fragment;
      } else if (!(fragment in anchors)) {
        throw Error(`No such anchor '${id}#${encodeURI(fragment)}'`);
      } else {
        return anchors[fragment];
      }
    },
    anchors: anchors,
    dynamicAnchors: dynamicAnchors,
    embedded: embedded
  };

  return embedded[id];
};

// There are only a few dialects, but their ids are normalized for every schema, so the results are cached
const normalizedDialectIds = new Map();
const normalizeDialectId = (dialectId) => {
  let normalizedDialectId = normalizedDialectIds.get(dialectId);
  if (normalizedDialectId === undefined) {
    normalizedDialectId = toAbsoluteIri(dialectId);
    normalizedDialectIds.set(dialectId, normalizedDialectId);
  }

  return normalizedDialectId;
};

// Values that aren't plain JSON objects, arrays, or scalars are converted with structuredClone. That converts things
// like class instances and null prototype objects to plain objects and leaves things like Dates for jsonTypeOf to
// reject.
const toPlainJson = (value) => {
  return typeof value === "object" && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype
    ? structuredClone(value)
    : value;
};

const isScalar = (value) => typeof value !== "object" || value === null;

// Returns a processed copy of the schema. The original isn't modified.
const processSchema = (json, id, dialectId, cursor, embedded, anchors, dynamicAnchors) => {
  json = toPlainJson(json);
  const jsonType = jsonTypeOf(json);

  if (jsonType === "object") {
    // Embedded Schema
    const embeddedDialectId = typeof json.$schema === "string" ? normalizeDialectId(json.$schema) : dialectId;
    const idToken = getKeywordName(embeddedDialectId, "https://json-schema.org/keyword/id");

    if (typeof json[idToken] === "string") {
      const embeddedId = toAbsoluteIri(resolveIri(json[idToken], id));
      embedded[embeddedId] = buildSchemaDocument({ ...json, [idToken]: embeddedId }, embeddedId, embeddedDialectId, embedded);
      return new Reference(embeddedId, {});
    }

    // Keywords that are processed here are left out of the result
    const omittedKeywords = new Set();

    // Legacy id
    const legacyIdToken = getKeywordName(embeddedDialectId, "https://json-schema.org/keyword/draft-04/id");
    if (typeof json[legacyIdToken] === "string") {
      if (json[legacyIdToken][0] === "#") {
        const anchor = decodeURIComponent(json[legacyIdToken].slice(1));
        anchors[anchor] = cursor;
        omittedKeywords.add(legacyIdToken);
      } else {
        const embeddedId = toAbsoluteIri(resolveIri(json[legacyIdToken], id));
        embedded[embeddedId] = buildSchemaDocument({ ...json, [legacyIdToken]: embeddedId }, embeddedId, embeddedDialectId, embedded);
        return new Reference(embeddedId, {});
      }
    }

    // Legacy $ref
    const jrefToken = getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/ref");
    if (typeof json[jrefToken] === "string") {
      // The reference keeps a copy of the whole object, so it isn't connected to the original schema. It's usually just
      // { "$ref": "..." }, so when there are no nested values, a shallow copy is enough.
      const referenceValue = Object.values(json).every(isScalar) ? { ...json } : structuredClone(json);
      if (omittedKeywords.has(legacyIdToken)) {
        delete referenceValue[legacyIdToken];
      }
      return new Reference(json[jrefToken], referenceValue);
    }

    // Anchors
    const anchorToken = getKeywordName(dialectId, "https://json-schema.org/keyword/anchor");
    if (typeof json[anchorToken] === "string") {
      anchors[json[anchorToken]] = cursor;
      omittedKeywords.add(anchorToken);
    }

    // Dynamic Anchors
    const dynamicAnchorToken = getKeywordName(dialectId, "https://json-schema.org/keyword/dynamicAnchor");
    if (typeof json[dynamicAnchorToken] === "string") {
      dynamicAnchors[json[dynamicAnchorToken]] = `${id}#${encodeURI(cursor)}`;
      omittedKeywords.add(dynamicAnchorToken);
    }

    // Legacy dynamic anchor
    const legacyDynamicAnchorToken = getKeywordName(dialectId, "https://json-schema.org/keyword/draft-2020-12/dynamicAnchor");
    if (typeof json[legacyDynamicAnchorToken] === "string") {
      dynamicAnchors[json[legacyDynamicAnchorToken]] = `${id}#${encodeURI(cursor)}`;
      anchors[json[legacyDynamicAnchorToken]] = cursor;
      omittedKeywords.add(legacyDynamicAnchorToken);
    }

    // References
    const referenceToken = getKeywordName(dialectId, "https://json-schema.org/keyword/ref");

    const result = {};
    for (const key of Object.keys(json)) {
      if (omittedKeywords.has(key)) {
        continue;
      }

      const value = key === referenceToken && typeof json[key] === "string"
        ? new Reference(json[key], json[key])
        : processSchema(json[key], id, dialectId, append(key, cursor), embedded, anchors, dynamicAnchors);

      if (key === "__proto__") {
        // Assigning would set the prototype rather than create a property
        Object.defineProperty(result, key, { value: value, enumerable: true, configurable: true, writable: true });
      } else {
        result[key] = value;
      }
    }

    return result;
  } else if (jsonType === "array") {
    const result = new Array(json.length);
    for (let index = 0; index < json.length; index++) {
      result[index] = processSchema(json[index], id, dialectId, append(index, cursor), embedded, anchors, dynamicAnchors);
    }

    return result;
  } else {
    return json;
  }
};

export const canonicalUri = (browser) => `${browser.document.baseUri}#${encodeURI(browser.cursor)}`;

export const toSchema = (browser, options = {}) => {
  if (!options.contextUri && browser.document.baseUri.startsWith("file:")) {
    options.contextUri = browser.document.baseUri;
  }

  const anchors = {};
  for (const anchor in browser.document.anchors) {
    if (anchor !== "" && !browser.document.dynamicAnchors[anchor]) {
      anchors[browser.document.anchors[anchor]] = anchor;
    }
  }

  const dynamicAnchors = {};
  for (const anchor in browser.document.dynamicAnchors) {
    const pointer = uriFragment(browser.document.dynamicAnchors[anchor]);
    dynamicAnchors[pointer] = anchor;
  }

  const legacyIdToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/draft-04/id");
  const idToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/id") || legacyIdToken;
  const anchorToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/anchor");
  const legacyAnchorToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/draft-04/id");
  const dynamicAnchorToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/dynamicAnchor");
  const legacyDynamicAnchorToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/draft-2020-12/dynamicAnchor");
  const recursiveAnchorToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/draft-2019-09/recursiveAnchor");
  const refToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/ref");
  const legacyRefToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/draft-04/ref");

  let schema = JSON.parse(jsonStringify(browser.document.root, (key, value, pointer) => {
    if (value instanceof Reference) {
      if (key === refToken) {
        return value.href;
      } else if (legacyIdToken) {
        if (JSON.stringify(value.toJSON()) === "{}") {
          return toSchema({ document: browser.document.embedded[toAbsoluteIri(value.href)] }, {
            ...options,
            contextDialectId: browser.document.dialectId
          });
        } else {
          return { [legacyRefToken]: value.href };
        }
      } else if (options.includeEmbedded ?? true) {
        return toSchema({ document: browser.document.embedded[toAbsoluteIri(value.href)] }, {
          ...options,
          contextDialectId: browser.document.dialectId
        });
      } else {
        return;
      }
    }

    if (jsonTypeOf(value) === "object") {
      value = { ...value };
      if (pointer in anchors) {
        if (anchorToken) {
          value[anchorToken] = anchors[pointer];
        }

        // Legacy anchor
        if (legacyAnchorToken) {
          value[legacyAnchorToken] = `#${anchors[pointer]}`;
        }
      }

      if (pointer in dynamicAnchors) {
        if (dynamicAnchorToken) {
          value[dynamicAnchorToken] = dynamicAnchors[pointer];
        }

        // Legacy dynamic anchor
        if (legacyDynamicAnchorToken) {
          value[legacyDynamicAnchorToken] = dynamicAnchors[pointer];
        }

        // Recursive anchor
        if (recursiveAnchorToken) {
          value[recursiveAnchorToken] = true;
        }
      }
    }

    return value;
  }));

  const definitionsToken = getKeywordName(browser.document.dialectId, "https://json-schema.org/keyword/definitions");
  if (Reflect.ownKeys(schema[definitionsToken] ?? {}).length === 0) {
    delete schema[definitionsToken];
  }

  // Self-identification
  if (options.contextUri) {
    const relativeUri = toRelativeIri(normalizeIri(options.contextUri), browser.document.baseUri);
    if (relativeUri !== "") {
      const id = schema[idToken] ? `${relativeUri}${schema[idToken]}` : relativeUri;
      delete schema[idToken];

      schema = {
        [idToken]: id,
        ...schema
      };
    }
  } else if (!browser.document.baseUri.startsWith("file:")) {
    const id = schema[idToken] ? `${browser.document.baseUri}${schema[idToken]}` : browser.document.baseUri;
    delete schema[idToken];

    schema = {
      [idToken]: id,
      ...schema
    };
  }

  // $schema
  switch (options.includeDialect ?? "auto") {
    case "auto":
      if (browser.document.dialectId === options.contextDialectId) {
        break;
      }
    case "always":
      schema = {
        $schema: browser.document.dialectId,
        ...schema
      };
      if (legacyIdToken) {
        schema.$schema += "#";
      }
      break;
    case "never":
      break;
    default:
      throw Error(`Unsupported value ToSchemaOptions.includeDialect: '${options.includeDialect}'`);
  }

  return schema;
};
