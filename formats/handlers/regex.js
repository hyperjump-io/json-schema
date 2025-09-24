export default {
  id: "https://json-schema.org/format/regex",
  handler: (regex) => {
    if (typeof regex !== "string") {
      return true;
    }

    try {
      new RegExp(regex, "u");
    } catch (_error) {
      return false;
    }

    return true;
  }
};
