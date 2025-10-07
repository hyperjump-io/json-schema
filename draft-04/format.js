import * as Browser from "@hyperjump/browser";
import * as Instance from "../lib/instance.js";
import { getShouldValidateFormat } from "../lib/configuration.js";
import { getFormatHandler } from "../lib/keywords.js";


const id = "https://json-schema.org/keyword/draft-04/format";

const compile = (schema) => Browser.value(schema);

const interpret = (format, instance) => {
  if (!getShouldValidateFormat()) {
    return true;
  }

  const handler = getFormatHandler(formats[format]);
  return handler?.(Instance.value(instance)) ?? true;
};

const annotation = (format) => format;

const formats = {
  "date-time": "https://json-schema.org/format/date-time",
  "email": "https://json-schema.org/format/email",
  "hostname": "https://json-schema.org/format/hostname",
  "ipv4": "https://json-schema.org/format/ipv4",
  "ipv6": "https://json-schema.org/format/ipv6",
  "uri": "https://json-schema.org/format/uri"
};

export default { id, compile, interpret, annotation, formats };
