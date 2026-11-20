import { liteFormats } from "./lite.js";
import idnEmailFormat from "./idn-email.js";
import hostnameFormat from "./draft-2020-12/hostname.js";
import idnHostnameFormat from "./idn-hostname.js";

/**
 * @import * as API from "./full.d.ts"
 */

/** @type typeof API.fullFormats */
export const fullFormats = [
  ...liteFormats,
  idnEmailFormat,
  hostnameFormat,
  idnHostnameFormat
];
