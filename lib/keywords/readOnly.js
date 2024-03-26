import metaData from "./meta-data.js";


const description = "This keyword indicates that the value of the instance is managed exclusively by the owning authority, and attempts by an application to modify the value of this property are expected to be ignored or rejected by that owning authority.";

export default { id: "https://json-schema.org/keyword/readOnly", ...metaData, description };
