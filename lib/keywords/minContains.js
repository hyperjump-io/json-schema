import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/minContains";

const description = "The minContains keyword is used in conjunction with the contains keyword to specify the minimum number of items in an array instance that must validate against the contains subschema. Read more: https://www.learnjsonschema.com/2020-12/validation/mincontains/";

const compile = (schema) => Browser.value(schema);
const interpret = () => true;

export default { id, description, compile, interpret };
