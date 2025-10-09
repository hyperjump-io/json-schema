import tr46 from "tr46";
import { isALabel } from "./a-label.js";


export const isIdnHostname = (hostname) => {
  const asciiHostname = tr46.toASCII(hostname);

  if (!asciiHostname) {
    return false;
  }

  return isALabel(asciiHostname);
};

export default {
  id: "https://json-schema.org/format/idn-hostname(partial)",
  handler: (hostname) => typeof hostname !== "string" || isIdnHostname(hostname)
};
