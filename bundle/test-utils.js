import { createHmac } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { basename, relative } from "node:path";
import { getKeywordName } from "../lib/keywords.js";
import { registerSchema, unregisterSchema } from "../lib/index.js";
import * as Instance from "../lib/instance.js";


export const testSuite = (path) => {
  const suite = [];
  readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .forEach((entry) => {
      const file = `${path}/${entry.name}`;
      const testCases = JSON.parse(readFileSync(file, "utf8"));
      suite.push(...testCases);
    });

  return suite;
};

export const md5 = (subject) => createHmac("md5", "hyperjump.io")
  .update(subject)
  .digest("hex");

export const isCompatible = (compatibility, versionUnderTest) => {
  if (compatibility === undefined) {
    return true;
  }

  const constraints = compatibility.split(",");
  for (const constraint of constraints) {
    const matches = /(?<operator><=|>=|=)?(?<version>\d+)/.exec(constraint);
    if (!matches) {
      throw Error(`Invalid compatibility string: ${compatibility}`);
    }

    const operator = matches[1] ?? ">=";
    const version = parseInt(matches[2], 10);

    switch (operator) {
      case ">=":
        if (versionUnderTest < version) {
          return false;
        }
        break;
      case "<=":
        if (versionUnderTest > version) {
          return false;
        }
        break;
      case "=":
        if (versionUnderTest !== version) {
          return false;
        }
        break;
      default:
        throw Error(`Unsupported contraint operator: ${operator}`);
    }
  }

  return true;
};

const fixtures = {};
readdirSync("bundle/fixtures", { withFileTypes: true, recursive: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith(".schema.json"))
  .forEach((entry) => {
    const path = relative("bundle/fixtures", `${entry.path}/${basename(entry.name, ".schema.json")}`);
    const retrievalUri = `https://bundler.hyperjump.io/${path}`;
    const fixture = JSON.parse(readFileSync(`${entry.path}/${entry.name}`, "utf8"));
    fixtures[retrievalUri] = fixture;
  });

export const loadSchemas = (testCase, retrievalUri, dialect) => {
  const schema = JSON.parse(JSON.stringify(testCase.schema));

  const definitionsToken = getKeywordName(dialect, "https://json-schema.org/keyword/definitions");
  if (!schema[definitionsToken]) {
    schema[definitionsToken] = {};
  }

  registerSchema(schema, retrievalUri, dialect);

  for (const retrievalUri in fixtures) {
    registerSchema(fixtures[retrievalUri], retrievalUri, dialect);
  }

  for (const retrievalUri in testCase.externalSchemas) {
    registerSchema(testCase.externalSchemas[retrievalUri], retrievalUri, dialect);
  }
};

export const unloadSchemas = (testCase, retrievalUri) => {
  unregisterSchema(retrievalUri);

  for (const retrievalUri in fixtures) {
    unregisterSchema(retrievalUri);
  }

  for (const retrievalUri in testCase.externalSchemas) {
    unregisterSchema(retrievalUri || testCase.externalSchemas[retrievalUri]?.$id || testCase.externalSchemas[retrievalUri]?.id);
  }
};

export const toOutput = (root) => {
  const output = {};
  for (const node of Instance.allNodes(root)) {
    output[Instance.uri(node)] = {
      errors: node.errors,
      annotations: node.annotations
    };
  }

  return output;
};
