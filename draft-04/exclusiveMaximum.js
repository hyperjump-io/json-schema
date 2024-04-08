const id = "https://json-schema.org/keyword/draft-04/exclusiveMaximum";
const compile = (schema) => schema.value;
const interpret = () => true;
const description = "Modifies the maximum keyword to succeed if the numberic instance is less than, but not equal to, the given number";

export default { id, compile, interpret, description };
