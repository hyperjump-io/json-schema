import * as Schema from "../schema.js";


const id = "https://json-schema.org/keyword/contentSchema";

const description = "This keyword declares a schema which describes the structure of the string. Read more: https://www.learnjsonschema.com/2020-12/content/contentschema/";

const compile = (contentSchema) => Schema.canonicalUri(contentSchema);
const interpret = () => true;

export default { id, description, compile, interpret };
