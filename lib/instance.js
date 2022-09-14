const JsonPointer = require("@hyperjump/json-pointer");
const curry = require("just-curry-it");
const { resolveUrl, jsonTypeOf } = require("./common");
const Reference = require("./reference");


const nil = Object.freeze({ id: "", pointer: "", instance: undefined, value: undefined });
const cons = (instance, id = "") => Object.freeze({ ...nil, id: resolveUrl(id, ""), instance, value: instance });

const get = (url, instance = nil) => {
  if (!url.startsWith("#")) {
    throw Error(`No JSON document found at '${url.split("#")[0]}'`);
  }

  return Object.freeze({ ...instance, pointer: url.substr(1) });
};

const uri = (doc) => `${doc.id}#${encodeURI(doc.pointer)}`;
const value = (doc) => Reference.isReference(doc.value) ? Reference.value(doc.value) : doc.value;
const has = (key, doc) => key in value(doc);
const typeOf = curry((doc, type) => jsonTypeOf(value(doc), type));

const step = (key, doc) => Object.freeze({
  ...doc,
  pointer: JsonPointer.append(key, doc.pointer),
  value: value(doc)[key]
});

const entries = (doc) => Object.keys(value(doc))
  .map((key) => [key, step(key, doc)]);

const keys = (doc) => Object.keys(value(doc));

const map = curry((fn, doc) => value(doc)
  .map((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

const forEach = curry((fn, doc) => value(doc)
  .forEach((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

const filter = curry((fn, doc) => value(doc)
  .map((item, ndx, array, thisArg) => step(ndx, doc, array, thisArg))
  .filter((item, ndx, array, thisArg) => fn(item, ndx, array, thisArg)));

const reduce = curry((fn, acc, doc) => value(doc)
  .reduce((acc, item, ndx) => fn(acc, step(ndx, doc), ndx), acc));

const every = curry((fn, doc) => value(doc)
  .every((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

const some = curry((fn, doc) => value(doc)
  .some((item, ndx, array, thisArg) => fn(step(ndx, doc), ndx, array, thisArg)));

const length = (doc) => value(doc).length;

module.exports = {
  nil, cons, get, uri, value, has, typeOf, length,
  step, entries, keys, map, forEach, filter, reduce, every, some
};
