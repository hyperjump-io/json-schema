const id = "https://json-schema.org/keyword/comment";

const description = `This keyword reserves a location for comments \
from schema authors to readers or maintainers of the schema.`;

const compile = () => undefined;
const interpret = () => true;

export default { id, description, compile, interpret };
