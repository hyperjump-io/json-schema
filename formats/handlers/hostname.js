const label = `(?!-)[A-Za-z0-9-]{1,63}(?<!-)`;
const domain = `${label}(?:\\.${label})*`;

const domainPattern = new RegExp(`^${domain}$`);

export const isHostname = (hostname) => {
  return domainPattern.test(hostname) && hostname.length < 256;
};

export default {
  id: "https://json-schema.org/format/hostname",
  handler: (hostname) => typeof hostname !== "string" || isHostname(hostname)
};
