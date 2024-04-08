const id = "https://json-schema.org/keyword/draft-04/exclusiveMinimum";
const compile = (schema) => schema.value;
const interpret = () => true;
const description = "Modifies the minimum keyword to succeed if the numberic instance is greater than, but not equal to, the given number";

export default { id, compile, interpret, description };
