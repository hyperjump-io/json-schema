const hexDigit = `[0-9a-fA-F]`;
const hexOctet = `(?:${hexDigit}{2})`;
const timeLow = `${hexOctet}{4}`;
const timeMid = `${hexOctet}{2}`;
const timeHighAndVersion = `${hexOctet}{2}`;
const clockSeqAndReserved = hexOctet;
const clockSeqLow = hexOctet;
const node = `${hexOctet}{6}`;

const uuid = `${timeLow}\\-${timeMid}\\-${timeHighAndVersion}\\-${clockSeqAndReserved}${clockSeqLow}\\-${node}`;

export const isUuid = RegExp.prototype.test.bind(new RegExp(`^${uuid}$`));

export default {
  id: "https://json-schema.org/format/uuid",
  handler: (uuid) => typeof uuid !== "string" || isUuid(uuid)
};
