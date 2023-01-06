import curry from "just-curry-it";
import * as Pact from "@hyperjump/pact";
import * as Json from "@hyperjump/json";
import * as JsonPointer from "@hyperjump/json-pointer";
import { jsonTypeOf, resolveUrl, urlFragment, pathRelative } from "./common.js";
import fetch from "./fetch.js";
import * as Keywords from "./keywords.js";
import * as MediaTypes from "./media-types.js";
import * as Reference from "./reference.js";


// Schema Management
const schemaStore = {};
const schemaStoreAlias = {};

const defaultDialectId = "https://json-schema.org/validation";

export const add = (schema, url = undefined, contextDialectId = undefined) => {
  schema = JSON.parse(JSON.stringify(schema));

  // Dialect / JSON Schema Version
  const dialectId = resolveUrl("", schema.$schema || contextDialectId || defaultDialectId);
  delete schema.$schema;

  if (!Keywords.hasDialect(dialectId)) {
    throw Error(`Encountered unknown dialect '${dialectId}'`);
  }

  // Identifiers
  const idToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/id")
    || Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/id");
  const internalUrl = resolveUrl(schema[idToken] || url, url);
  const id = resolveUrl("", internalUrl);
  delete schema[idToken];
  if (url) {
    const externalId = resolveUrl("", url);
    schemaStoreAlias[externalId] = id;
  }

  // Vocabulary
  const vocabularyToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/vocabulary");
  if (jsonTypeOf(schema[vocabularyToken], "object")) {
    const allowUnknownKeywords = schema[vocabularyToken]["https://json-schema.org/draft/2019-09/vocab/core"]
      || schema[vocabularyToken]["https://json-schema.org/draft/2020-12/vocab/core"];

    Keywords.loadDialect(id, schema[vocabularyToken], allowUnknownKeywords);
    delete schema[vocabularyToken];
  }

  const dynamicAnchors = {};

  // Recursive anchor
  const recursiveAnchorToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/draft-2019-09/recursiveAnchor");
  if (schema[recursiveAnchorToken] === true) {
    dynamicAnchors[""] = `${id}#`;
  }
  delete schema[recursiveAnchorToken];

  // Store Schema
  const anchors = { "": "" };
  schemaStore[id] = {
    id: id,
    dialectId: dialectId,
    schema: processSchema(schema, id, dialectId, JsonPointer.nil, anchors, dynamicAnchors),
    anchors: anchors,
    dynamicAnchors: dynamicAnchors,
    validated: false
  };

  return id;
};

const processSchema = (subject, id, dialectId, pointer, anchors, dynamicAnchors) => {
  if (jsonTypeOf(subject, "object")) {
    // Legacy id
    const legacyIdToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/id");
    if (typeof subject[legacyIdToken] === "string") {
      if (subject[legacyIdToken][0] === "#") {
        const anchor = decodeURIComponent(subject[legacyIdToken].slice(1));
        anchors[anchor] = pointer;
      } else {
        delete subject[legacyIdToken].$schema;
        subject[legacyIdToken] = resolveUrl(subject[legacyIdToken], id);
        add(subject, undefined, dialectId);
        return Reference.cons(subject[legacyIdToken], subject);
      }
      delete subject[legacyIdToken];
    }

    // Embedded Schema
    const embeddedDialectId = typeof subject.$schema === "string" ? resolveUrl("", subject.$schema) : dialectId;
    const idToken = Keywords.getKeywordName(embeddedDialectId, "https://json-schema.org/keyword/id");
    if (typeof subject[idToken] === "string") {
      subject[idToken] = resolveUrl(subject[idToken], id);
      add(subject, undefined, dialectId);
      return Reference.cons(subject[idToken], subject);
    }

    // Legacy dynamic anchor
    const legacyDynamicAnchorToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/draft-2020-12/dynamicAnchor");
    if (typeof subject[legacyDynamicAnchorToken] === "string") {
      dynamicAnchors[subject[legacyDynamicAnchorToken]] = `${id}#${encodeURI(pointer)}`;
      anchors[subject[legacyDynamicAnchorToken]] = pointer;
      delete subject[legacyDynamicAnchorToken];
    }

    const dynamicAnchorToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/dynamicAnchor");
    if (typeof subject[dynamicAnchorToken] === "string") {
      dynamicAnchors[subject[dynamicAnchorToken]] = `${id}#${encodeURI(pointer)}`;
      delete subject[dynamicAnchorToken];
    }

    const anchorToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/anchor");
    if (typeof subject[anchorToken] === "string") {
      anchors[subject[anchorToken]] = pointer;
      delete subject[anchorToken];
    }

    // Legacy $ref
    const jrefToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/draft-04/ref");
    if (typeof subject[jrefToken] === "string") {
      return Reference.cons(subject[jrefToken], subject);
    }

    for (const key in subject) {
      subject[key] = processSchema(subject[key], id, dialectId, JsonPointer.append(key, pointer), anchors, dynamicAnchors);
    }
  } else if (Array.isArray(subject)) {
    for (let index = 0; index < subject.length; index++) {
      subject[index] = processSchema(subject[index], id, dialectId, JsonPointer.append(index, pointer), anchors, dynamicAnchors);
    }
  }

  return subject;
};

const hasStoredSchema = (id) => id in schemaStore || id in schemaStoreAlias;
const getStoredSchema = (id) => schemaStore[schemaStoreAlias[id]] || schemaStore[id];

export const markValidated = (id) => {
  schemaStore[id].validated = true;
};

// Schema Retrieval
const nil = Object.freeze({
  id: undefined,
  dialectId: undefined,
  pointer: JsonPointer.nil,
  schema: undefined,
  value: undefined,
  anchors: {},
  dynamicAnchors: {},
  validated: true
});

export const get = async (url, contextDoc = nil) => {
  const resolvedUrl = resolveUrl(url, uri(contextDoc));
  const id = resolveUrl("", resolvedUrl);
  const fragment = urlFragment(resolvedUrl);

  if (!hasStoredSchema(id)) {
    const response = await fetch(id, { headers: { Accept: "application/schema+json" } });
    if (response.status >= 400) {
      await response.text(); // Sometimes node hangs without this hack
      throw Error(`Failed to retrieve schema with id: ${id}`);
    }

    const [schema, contextDialectId] = await MediaTypes.parse(response);

    // Try to determine the dialect from the meta-schema if it isn't already known
    const dialectId = resolveUrl("", schema.$schema || contextDialectId || defaultDialectId);
    if (!Keywords.hasDialect(dialectId) && !hasStoredSchema(dialectId)) {
      await get(dialectId);
    }

    add(schema, id, contextDialectId);
  }

  const storedSchema = getStoredSchema(id);
  const pointer = fragment[0] !== "/" ? getAnchorPointer(storedSchema, fragment) : fragment;
  const doc = Object.freeze({
    ...storedSchema,
    pointer: pointer,
    value: JsonPointer.get(pointer, storedSchema.schema)
  });

  return followReferences(doc);
};

const followReferences = (doc) => Reference.isReference(doc.value) ? get(Reference.href(doc.value), doc) : doc;

const getAnchorPointer = (schema, fragment) => {
  if (!(fragment in schema.anchors)) {
    throw Error(`No such anchor '${encodeURI(schema.id)}#${encodeURI(fragment)}'`);
  }

  return schema.anchors[fragment];
};

// Utility Functions
export const uri = (doc) => doc.id ? `${doc.id}#${encodeURI(doc.pointer)}` : undefined;
export const value = (doc) => Reference.isReference(doc.value) ? Reference.value(doc.value) : doc.value;
export const has = (key, doc) => key in value(doc);
export const typeOf = (doc, type) => jsonTypeOf(value(doc), type);

export const step = (key, doc) => {
  const storedSchema = getStoredSchema(doc.id);
  const nextDoc = Object.freeze({
    ...doc,
    pointer: JsonPointer.append(`${key}`, doc.pointer),
    value: value(doc)[key],
    validated: storedSchema.validated
  });
  return followReferences(nextDoc);
};

export const keys = (doc) => Object.keys(value(doc));

export const entries = (doc) => Pact.pipeline([
  value,
  Object.keys,
  Pact.map(async (key) => [key, await step(key, doc)]),
  Pact.all
], doc);

export const map = curry((fn, doc) => Pact.pipeline([
  value,
  Pact.map(async (item, ndx) => fn(await step(ndx, doc), ndx)),
  Pact.all
], doc));

export const length = (doc) => value(doc).length;

const toSchemaDefaultOptions = {
  parentId: "",
  parentDialect: "",
  includeEmbedded: true
};
export const toSchema = (schemaDoc, options = {}) => {
  const fullOptions = { ...toSchemaDefaultOptions, ...options };

  const idToken = Keywords.getKeywordName(schemaDoc.dialectId, "https://json-schema.org/keyword/id");
  const anchorToken = Keywords.getKeywordName(schemaDoc.dialectId, "https://json-schema.org/keyword/anchor");
  const dynamicAnchorToken = Keywords.getKeywordName(schemaDoc.dialectId, "https://json-schema.org/keyword/dynamicAnchor");
  const legacyDynamicAnchorToken = Keywords.getKeywordName(schemaDoc.dialectId, "https://json-schema.org/keyword/draft-2020-12/dynamicAnchor");
  const recursiveAnchorToken = Keywords.getKeywordName(schemaDoc.dialectId, "https://json-schema.org/keyword/recursiveAnchor");

  const anchors = {};
  for (const anchor in schemaDoc.anchors) {
    if (anchor !== "" && !schemaDoc.dynamicAnchors[anchor]) {
      anchors[schemaDoc.anchors[anchor]] = anchor;
    }
  }

  const dynamicAnchors = {};
  for (const anchor in schemaDoc.dynamicAnchors) {
    const pointer = urlFragment(schemaDoc.dynamicAnchors[anchor]);
    dynamicAnchors[pointer] = anchor;
  }

  const schema = JSON.parse(Json.stringify(schemaDoc.schema, (key, value, pointer) => {
    if (Reference.isReference(value)) {
      const refValue = Reference.value(value);
      if (!fullOptions.includeEmbedded && idToken in refValue) {
        return;
      } else {
        return Reference.value(value);
      }
    } else {
      if (pointer in anchors) {
        value = { [anchorToken]: anchors[pointer], ...value };
      }
      if (pointer in dynamicAnchors) {
        if (dynamicAnchorToken) {
          value = { [dynamicAnchorToken]: dynamicAnchors[pointer], ...value };
        }

        // Legacy dynamic anchor
        if (legacyDynamicAnchorToken) {
          value = { [legacyDynamicAnchorToken]: dynamicAnchors[pointer], ...value };
        }

        // Recursive anchor
        if (recursiveAnchorToken) {
          value = { [recursiveAnchorToken]: true, ...value };
        }
      }
      return value;
    }
  }));

  const id = relativeUri(fullOptions.parentId, schemaDoc.id);
  const dialect = fullOptions.parentDialect === schemaDoc.dialectId ? "" : schemaDoc.dialectId;
  return {
    ...(id && { [idToken]: id }),
    ...(dialect && { $schema: dialect }),
    ...schema
  };
};

const relativeUri = (from, to) => {
  if (to.startsWith("file://")) {
    const pathToSchema = from.slice(7, from.lastIndexOf("/"));
    return from === "" ? "" : pathRelative(pathToSchema, to.slice(7));
  } else {
    return to;
  }
};