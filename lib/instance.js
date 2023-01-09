import * as JsonPointer from "@hyperjump/json-pointer";
import curry from "just-curry-it";
import { toAbsoluteUri, jsonTypeOf } from "./common.js";
import * as Reference from "./reference.js";


export const nil = Object.freeze({ id: undefined, pointer: "", instance: undefined, value: undefined });
export const cons = (instance, id = undefined) => Object.freeze({
  ...nil,
  id: id ? toAbsoluteUri(id) : "",
  instance,
  value: instance
});

export const get = (url, instance = nil) => {
  if (!url.startsWith("#")) {
    throw Error(`No JSON document found at '${url.split("#")[0]}'`);
  }

  return Object.freeze({ ...instance, pointer: url.substr(1) });
};

export const uri = (doc) => `${doc.id || ""}#${encodeURI(doc.pointer)}`;
export const value = (doc) => Reference.isReference(doc.value) ? Reference.value(doc.value) : doc.value;
export const has = (key, doc) => key in value(doc);
export const typeOf = curry((doc, type) => jsonTypeOf(value(doc), type));

export const step = (key, doc) => Object.freeze({
  ...doc,
  pointer: JsonPointer.append(key, doc.pointer),
  value: value(doc)[key]
});

export const entries = (doc) => Object.keys(value(doc))
  .map((key) => [key, step(key, doc)]);

export const keys = (doc) => Object.keys(value(doc));

export const map = curry((fn, doc) => value(doc)
  .map((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

export const forEach = curry((fn, doc) => value(doc)
  .forEach((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

export const filter = curry((fn, doc) => value(doc)
  .map((item, ndx, array, thisArg) => step(ndx, doc, array, thisArg))
  .filter((item, ndx, array, thisArg) => fn(item, ndx, array, thisArg)));

export const reduce = curry((fn, acc, doc) => value(doc)
  .reduce((acc, item, ndx) => fn(acc, step(ndx, doc), ndx), acc));

export const every = curry((fn, doc) => value(doc)
  .every((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

export const some = curry((fn, doc) => value(doc)
  .some((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

export const length = (doc) => value(doc).length;
