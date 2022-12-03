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

export const add = (schema, url = "", contextDialectId = undefined) => {
  schema = JSON.parse(JSON.stringify(schema));

  // Dialect / JSON Schema Version
  const dialectId = resolveUrl(schema.$schema || contextDialectId || defaultDialectId, "");
  delete schema.$schema;

  if (!Keywords.hasDialect(dialectId)) {
    throw Error(`Encountered unknown dialect '${dialectId}'`);
  }

  // Identifiers
  const idToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/id");
  const externalId = resolveUrl(url, "");
  const internalUrl = resolveUrl(externalId, schema[idToken] || "");
  const id = resolveUrl(internalUrl, "");
  if (!id) {
    throw Error("Couldn't determine an identifier for the schema");
  }
  delete schema[idToken];
  if (externalId) {
    schemaStoreAlias[externalId] = id;
  }

  // Vocabulary
  const vocabularyToken = Keywords.getKeywordName(dialectId, "https://json-schema.org/keyword/vocabulary");
  if (jsonTypeOf(schema[vocabularyToken], "object")) {
    Keywords.loadDialect(id, schema[vocabularyToken]);
    delete schema[vocabularyToken];
  }

  // Store Schema
  const anchors = { "": "" };
  const dynamicAnchors = {};
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
    // Embedded Schema
    const embeddedDialectId = typeof subject.$schema === "string" ? resolveUrl(subject.$schema, "") : dialectId;
    const idToken = Keywords.getKeywordName(embeddedDialectId, "https://json-schema.org/keyword/id");
    if (typeof subject[idToken] === "string") {
      subject[idToken] = resolveUrl(id, subject[idToken]);
      add(subject, "", dialectId);
      return Reference.cons(subject[idToken], subject);
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
  id: "",
  dialectId: undefined,
  pointer: JsonPointer.nil,
  schema: undefined,
  value: undefined,
  anchors: {},
  dynamicAnchors: {},
  validated: true
});

export const get = async (url, contextDoc = nil) => {
  const resolvedUrl = resolveUrl(uri(contextDoc), url);
  const id = resolveUrl(resolvedUrl, "");
  const fragment = urlFragment(resolvedUrl);

  if (!hasStoredSchema(id)) {
    const response = await fetch(id, { headers: { Accept: "application/schema+json" } });
    if (response.status >= 400) {
      await response.text(); // Sometimes node hangs without this hack
      throw Error(`Failed to retrieve schema with id: ${id}`);
    }

    const [schema, contextDialectId] = await MediaTypes.parse(response);

    // Try to determine the dialect from the meta-schema if it isn't already known
    const dialectId = resolveUrl(schema.$schema || contextDialectId || defaultDialectId, "");
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
export const uri = (doc) => `${doc.id}#${encodeURI(doc.pointer)}`;
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
