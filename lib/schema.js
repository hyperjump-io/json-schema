const { resolve: resolveUrl } = require("url");
const curry = require("just-curry-it");
const JsonPointer = require("@hyperjump/json-pointer");
const { isObject, splitUrl } = require("./common");
const fetch = require("./fetch");


const schemaStore = {};

const add = (schema, url = "", defaultSchemaVersion = "") => {
  const schemaVersion = splitUrl(schema["$schema"] || defaultSchemaVersion)[0];
  if (!schemaVersion) {
    throw Error("Couldn't determine schema version");
  }
  delete schema["$schema"];

  const id = splitUrl(url || schema["$id"] || "")[0];
  if (!id) {
    throw Error("Couldn't determine an identifier for the schema");
  }

  const anchors = {};
  schemaStore[id] = {
    schemaVersion: schemaVersion,
    schema: processSchema(schema, id, schemaVersion, JsonPointer.nil, anchors),
    anchors: anchors,
    recursiveAnchor: !!schema["$recursiveAnchor"]
  };
};

const processSchema = (subject, id, schemaVersion, pointer, anchors) => {
  if (isObject(subject)) {
    if (typeof subject["$id"] === "string") {
      const ref = subject["$id"];
      const resolvedUrl = safeResolveUrl(id, ref);
      const [schemaId, fragment] = splitUrl(resolvedUrl);
      delete subject["$id"];

      if (fragment) {
        subject["$anchor"] = fragment;
      }

      if (schemaId !== id) {
        add(subject, safeResolveUrl(id, schemaId), schemaVersion);
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

const nil = Object.freeze({ id: "", schemaVersion: undefined, pointer: "", schema: undefined, recursiveAnchor: false });

const get = async (url, contextDoc = nil, recursive = false) => {
  const contextUrl = recursive && contextDoc.recursiveAnchor ? contextDoc.recursiveAnchor : uri(contextDoc);
  const resolvedUrl = safeResolveUrl(contextUrl, url);
  const [id, fragment] = splitUrl(resolvedUrl);

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

const safeResolveUrl = (contextUrl, url) => {
  const resolvedUrl = resolveUrl(contextUrl, url);
  if (getScheme(resolvedUrl) === "file" && getScheme(contextUrl) !== "file") {
    throw Error("Can't access file resource from network context");
  }
  return resolvedUrl;
};

const getScheme = (url) => {
  const matches = url.match(/(.+):\/\//)[1];
  return matches ? matches[1] : "";
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
