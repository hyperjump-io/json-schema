const { Schema, Json } = require("@hyperjump/json-schema-core");
const { isObject } = require("../../../../common");


const compile = (schema) => Schema.value(schema);

const interpret = (type, json) => {
  const value = Json.value(json);
  return typeof type === "string" ? isType[type](value) : type.some((t) => isType[t](value));
};

const isType = {
  "null": (value) => value === null,
  "boolean": (value) => typeof value === "boolean",
  "object": isObject,
  "array": (value) => Array.isArray(value),
  "number": (value) => typeof value === "number",
  "integer": (value) => Number.isInteger(value),
  "string": (value) => typeof value === "string"
};

module.exports = { compile, interpret };
