export { addSchema, validate, FLAG } from "./core.js";
export type { Validator, OutputFormat, CompiledSchema, OutputUnit } from "./core.js";
export {
  getMetaSchemaOutputFormat,
  setMetaSchemaOutputFormat,
  getShouldValidateSchema,
  setShouldValidateSchema
} from "./configuration.js";
export { InvalidSchemaError } from "./invalid-schema-error.js";
export { addMediaTypePlugin } from "./media-types.js";
export type { MediaTypePlugin } from "./media-types.js";
