const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const { terser } = require("rollup-plugin-terser");


const flatMap = (fn, list) => list.reduce((acc, x) => acc.concat(fn(x)), []);
const combine = (lists, items) => flatMap((item) => lists.map((list) => [...list, item]), items);
const combinations = (...lists) => lists.reduce(combine, [[]]);

const formats = ["amd", "cjs", "esm", "iife", "umd", "system"];
const minify = [true, false];
const config = combinations(formats, minify);

module.exports = config.map(([format, minify]) => ({
  input: "lib/index.js",
  output: {
    format: format,
    file: `dist/json-schema-${format}${minify ? ".min" : ""}.js`,
    name: "JsonSchema",
    sourcemap: true,
    exports: "named"
  },
  plugins: [
    resolve({
      browser: true
    }),
    commonjs(),
    minify && terser()
  ]
}));
