import dateTimeFormat from "./date-time.js";
import dateFormat from "./date.js";
import timeFormat from "./time.js";
import durationFormat from "./duration.js";
import emailFormat from "./email.js";
import hostnameFormat from "./hostname.js";
import ipv4Format from "./ipv4.js";
import ipv6Format from "./ipv6.js";
import uriFormat from "./uri.js";
import uriReferenceFormat from "./uri-reference.js";
import iriFormat from "./iri.js";
import iriReferenceFormat from "./iri-reference.js";
import uuidFormat from "./uuid.js";
import uriTemplateFormat from "./uri-template.js";
import jsonPointerFormat from "./json-pointer.js";
import relativeJsonPointerFormat from "./relative-json-pointer.js";
import regexFormat from "./regex.js";

/**
 * @import * as API from "./lite.d.ts"
 */

/** @type typeof API.liteFormats */
export const liteFormats = [
  dateTimeFormat,
  dateFormat,
  timeFormat,
  durationFormat,
  emailFormat,
  hostnameFormat,
  ipv4Format,
  ipv6Format,
  uriFormat,
  uriReferenceFormat,
  iriFormat,
  iriReferenceFormat,
  uuidFormat,
  uriTemplateFormat,
  jsonPointerFormat,
  relativeJsonPointerFormat,
  regexFormat
];
