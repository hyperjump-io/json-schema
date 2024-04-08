import * as Browser from "@hyperjump/browser";
import { pipe, asyncMap, asyncCollectArray } from "@hyperjump/pact";
import Validation from "./validation.js";


const id = "https://json-schema.org/keyword/definitions";
const description = `The \`$defs\` keyword provides a standardized way to define \
reusable subschemas within a single schema document, promoting modularity, reducing \
code duplication, and improving schema organization. Each subschema within $defs has a \
unique name, acting as a location for referencing, without directly affecting validation; \
its value must be a valid JSON Schema.`;

const compile = (schema, ast) => pipe(
  Browser.values(schema),
  asyncMap((definitionSchema) => Validation.compile(definitionSchema, ast)),
  asyncCollectArray
);

const interpret = () => true;

export default { id, compile, interpret, description };
