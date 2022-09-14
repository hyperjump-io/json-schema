const fs = require("fs/promises");
const fetch = require("node-fetch");
const Url = require("url");
const MediaTypes = require("./media-types");


module.exports = async (url, options) => {
  if (url.startsWith("file://")) {
    const filePath = Url.fileURLToPath(url);
    const fd = await fs.open(filePath);
    const stream = fd.createReadStream();
    return new fetch.Response(stream, {
      url: url,
      headers: { "Content-Type": MediaTypes.getContentType(filePath) }
    });
  } else {
    return fetch(url, options);
  }
};
