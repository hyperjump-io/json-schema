import { addFormat } from "../lib/keywords.js";

import dateTime from "./handlers/date-time.js";
import date from "./handlers/date.js";
import time from "./handlers/time.js";
import duration from "./handlers/duration.js";
import ipv4 from "./handlers/ipv4.js";
import ipv6 from "./handlers/ipv6.js";
import uri from "./handlers/uri.js";
import uriReference from "./handlers/uri-reference.js";
import iri from "./handlers/iri.js";
import iriReference from "./handlers/iri-reference.js";
import uuid from "./handlers/uuid.js";


addFormat(dateTime);
addFormat(date);
addFormat(time);
addFormat(duration);
addFormat(ipv4);
addFormat(ipv6);
addFormat(uri);
addFormat(uriReference);
addFormat(iri);
addFormat(iriReference);
addFormat(uuid);

export {
  getShouldValidateFormat,
  setShouldValidateFormat
} from "../lib/configuration.js";
