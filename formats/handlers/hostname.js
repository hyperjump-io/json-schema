import tr46 from "tr46";


const label = `[A-Za-z0-9-]{1,63}`;
const domain = `${label}(?:\\.${label})*`;

const domainPattern = new RegExp(`^${domain}$`);

const parserOptions = {
  checkBidi: true,
  checkJoiners: true,
  checkHyphens: true
};

export const isHostname = (hostname) => {
  return domainPattern.test(hostname)
    && hostname.length < 256
    && !tr46.toUnicode(hostname, parserOptions).error;
};

export default {
  id: "https://json-schema.org/format/hostname",
  handler: (hostname) => typeof hostname !== "string" || isHostname(hostname)
};
