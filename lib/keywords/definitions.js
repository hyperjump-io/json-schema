import * as Pact from "@hyperjump/pact";
import * as Schema from "../schema.js";
import Validate from "./validate.js";


const id = "https://json-schema.org/keyword/definitions";

const compile = async (schema, ast) => {
  await Pact.pipeline([
    Schema.entries,
    Pact.map(([, definitionSchema]) => Validate.compile(definitionSchema, ast)),
    Pact.all
  ], schema);
};

const interpret = () => true;

export default { id, compile, interpret };
