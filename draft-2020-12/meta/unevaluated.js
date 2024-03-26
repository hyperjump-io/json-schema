import unevaluatedItems from "../../lib/keywords/unevaluatedItems.js";
import unevaluatedProperties from "../../lib/keywords/unevaluatedProperties.js";


export default {
  "$id": "https://json-schema.org/draft/2020-12/meta/unevaluated",
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$dynamicAnchor": "meta",

  "title": "Unevaluated applicator vocabulary meta-schema",
  "properties": {
    "unevaluatedItems": { "$dynamicRef": "#meta", "description": unevaluatedItems.description },
    "unevaluatedProperties": { "$dynamicRef": "#meta", "description": unevaluatedProperties.description }
  }
};
