const decOctet = `(?:\\d|[1-9]\\d|1\\d\\d|2[0-4]\\d|25[0-5])`;
const ipV4Address = `${decOctet}\\.${decOctet}\\.${decOctet}\\.${decOctet}`;

export const isIPv4 = RegExp.prototype.test.bind(new RegExp(`^${ipV4Address}$`));

export default {
  id: "https://json-schema.org/format/ipv4",
  handler: (ip) => typeof ip !== "string" || isIPv4(ip)
};
