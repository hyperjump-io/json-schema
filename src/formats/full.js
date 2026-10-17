import { liteFormats } from "./lite.js";
import idnEmailFormat from "./idn-email.js";
import hostnameFormat from "./hostname.js";
import idnHostnameFormat from "./idn-hostname.js";

/**
 * @import * as API from "./full.d.ts"
 */

/** @type API.fullFormats */
export const fullFormats = [
  ...liteFormats,
  idnEmailFormat,
  hostnameFormat,
  idnHostnameFormat
];

/** @type API.addFullFormats */
export const addFullFormats = (jsonSchema) => {
  for (const format of fullFormats) {
    jsonSchema.addFormat(format);
  }
};
