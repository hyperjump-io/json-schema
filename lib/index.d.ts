import type { Core, Schema, Keywords, InvalidSchemaError } from "@hyperjump/json-schema-core";


export type JsonSchema = {
  add: typeof Schema.add;
  get: typeof Schema.get;
  validate: typeof Core.validate;
  compile: typeof Core.compile;
  interpret: typeof Core.interpret;
  setMetaOutputFormat: typeof Core.setMetaOutputFormat;
  setShouldMetaValidate: typeof Core.setShouldMetaValidate;
  FLAG: typeof Core.FLAG;
  BASIC: typeof Core.BASIC;
  DETAILED: typeof Core.DETAILED;
  VERBOSE: typeof Core.VERBOSE;
  Keywords: typeof Keywords;
  InvalidSchemaError: typeof InvalidSchemaError;
};

export * from "@hyperjump/json-schema-core";
export * from "./draft-04";
export * from "./draft-06";
export * from "./draft-07";
export * from "./draft-2019-09";
export * from "./draft-2020-12";

declare const jsonSchema: JsonSchema;
export default jsonSchema;
