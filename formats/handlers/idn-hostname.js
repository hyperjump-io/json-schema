import tr46 from "tr46";
import { isHostname } from "./hostname.js";


export const isIdnHostname = (hostname) => {
  const asciiHostname = tr46.toASCII(hostname);

  if (!asciiHostname) {
    return false;
  }

  return isHostname(asciiHostname);
};

export default {
  id: "https://json-schema.org/format/idn-hostname",
  handler: (hostname) => typeof hostname !== "string" || isIdnHostname(hostname)
};
