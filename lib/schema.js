const { resolve: resolveUrl } = require("url");
const curry = require("just-curry-it");
const JsonPointer = require("@hyperjump/json-pointer");
const { isObject } = require("./common");
const fetch = require("./fetch");


const schemaStore = {};

const add = (schema, url = "", defaultSchemaVersion = "") => {
  const schemaVersion = (schema["$schema"] || defaultSchemaVersion).split("#", 1)[0];
  if (!schemaVersion) {
    throw Error("Could not determine schema version");
  }
  delete schema["$schema"];

  const id = (url || schema["$id"] || "").split("#", 1)[0];
  if (id) {
    const anchors = {};
    schemaStore[id] = {
      schemaVersion: schemaVersion.split("#", 1)[0],
      schema: processSchema(schema, id, schemaVersion, JsonPointer.nil, anchors),
      anchors: anchors,
      recursiveAnchor: !!schema["$recursiveAnchor"]
    };
  }
};

const processSchema = (subject, id, schemaVersion, pointer, anchors) => {
  if (isObject(subject)) {
    if (typeof subject["$id"] === "string") {
      const ref = subject["$id"];
      const [schemaId, urlFragment = ""] = resolveUrl(id, ref).split("#", 2);
      delete subject["$id"];

      if (urlFragment) {
        subject["$anchor"] = decodeURI(urlFragment);
      }

      if (schemaId !== id) {
        add(subject, resolveUrl(id, schemaId), schemaVersion);
        return { "$__jref": ref };
      }
    }

    if (typeof subject["$anchor"] === "string") {
      anchors[subject["$anchor"]] = pointer;
      delete subject["$anchor"];
    }

    return Object.entries(subject)
      .reduce((acc, [key, value]) => {
        acc[key] = processSchema(value, id, schemaVersion, JsonPointer.append(key, pointer), anchors);
        return acc;
      }, {});
  } else if (Array.isArray(subject)) {
    return subject.map((item, ndx) => processSchema(item, id, schemaVersion, JsonPointer.append(ndx, pointer), anchors));
  } else {
    return subject;
  }
};

const nil = Object.freeze({ id: "http://", schemaVersion: undefined, pointer: "", schema: undefined, recursiveAnchor: false });

const get = async (url, contextDoc = nil, recursive = false) => {
  const contextUrl = recursive && contextDoc.recursiveAnchor ? contextDoc.recursiveAnchor : uri(contextDoc);
  const resolvedUrl = resolveUrl(contextUrl, url);
  const [urlReference, urlFragment = ""] = resolvedUrl.split("#", 2);
  const id = decodeURI(urlReference);
  const fragment = decodeURI(urlFragment);

  if (!(id in schemaStore)) {
    const response = await fetch(id);
    add(await response.json(), id);
  }

  const pointer = fragment && fragment[0] !== "/" ? schemaStore[id].anchors[fragment] : fragment;
  const doc = Object.freeze({
    id: id,
    schemaVersion: schemaStore[id].schemaVersion,
    pointer: pointer,
    schema: schemaStore[id].schema,
    recursiveAnchor: contextDoc.recursiveAnchor || (schemaStore[id].recursiveAnchor ? id : false)
  });
  const docValue = value(doc);
  return isJref(docValue) ? await get(docValue["$__jref"], doc, recursive) : doc;
};

const isJref = (value) => isObject(value) && "$__jref" in value;
const uri = (doc) => `${doc.id}#${encodeURI(doc.pointer)}`;
const value = (doc) => JsonPointer.get(doc.pointer, doc.schema);

const step = (key, doc) => {
  const keyPointer = JsonPointer.append(key, doc.pointer);
  return get(`#${encodeURI(keyPointer)}`, doc);
};

const sibling = (key, doc) => {
  const segments = doc.pointer.split("/");
  segments.pop();
  const keyPointer = JsonPointer.append(key, segments.join("/"));
  return get(`#${encodeURI(keyPointer)}`, doc);
};

const entries = (doc) => Object.keys(value(doc))
  .map((key) => [key, step(key, doc)]);

const map = curry((fn, doc) => Object.keys(value(doc))
  .map(async (key) => fn(await step(key, doc))));

module.exports = { add, get, uri, value, step, sibling, entries, map };
