import * as Browser from "@hyperjump/browser";


const id = "https://json-schema.org/keyword/maxContains";

const description = "The maxContains keyword is used in conjunction with the contains keyword to specify the maximum number of items in an array instance that must validate against the contains subschema. Read more: https://www.learnjsonschema.com/2020-12/validation/maxcontains/";

const compile = (schema) => Browser.value(schema);
const interpret = () => true;

export default { id, description, compile, interpret };
