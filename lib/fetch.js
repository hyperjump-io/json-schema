const fs = require("fs");
const makeFetchHappen = require("make-fetch-happen");
const { Response } = require("node-fetch-npm");


const fetch = makeFetchHappen.defaults({ cacheManager: "./http-cache" });

module.exports = (url, options) => {
  if (url.startsWith("file://")) {
    const path = url.match(/file:\/\/(.+)/)[1];
    const stream = fs.createReadStream(path);
    return new Response(stream);
  } else {
    return fetch(url, options);
  }
};
