import { subscribe, unsubscribe } from "../lib/pubsub.js";
import { AnnotatedJsInstance } from "./annotated-instance.js";
import { ValidationError } from "./validation-error.js";
import { getSchema, getKeyword, compile, interpret as validate, BASIC } from "../lib/experimental.js";


export const annotate = async (schemaUri, json = undefined, outputFormat = undefined) => {
  const schema = await getSchema(schemaUri);
  const compiled = await compile(schema);
  const interpretAst = (json, outputFormat) => interpret(compiled, new AnnotatedJsInstance(json), outputFormat);

  return json === undefined ? interpretAst : interpretAst(json, outputFormat);
};

export const interpret = ({ ast, schemaUri }, instance, outputFormat = BASIC) => {
  loadKeywordSupport();

  const output = [instance];
  const subscriptionToken = subscribe("result", outputHandler(output));

  try {
    const result = validate({ ast, schemaUri }, instance, outputFormat);
    if (!result.valid) {
      throw new ValidationError(result);
    }
  } finally {
    unsubscribe("result", subscriptionToken);
  }

  return output[0];
};

const outputHandler = (output) => {
  let isPassing = true;
  const instanceStack = [];

  return (message, resultNode) => {
    if (message === "result.start") {
      instanceStack.push(output[0]);
      isPassing = true;
    } else if (message === "result" && isPassing) {
      output[0] = output[0].get(resultNode.instanceLocation);

      if (resultNode.valid) {
        const keywordHandler = getKeyword(resultNode.keyword);
        if (keywordHandler?.annotation) {
          const annotation = keywordHandler.annotation(resultNode.ast);
          output[0] = output[0].annotate(resultNode.keyword, annotation);
        }
      } else {
        output[0] = instanceStack[instanceStack.length - 1];
        isPassing = false;
      }
    } else if (message === "result.end") {
      instanceStack.pop();
    }
  };
};

const identity = (a) => a;

const loadKeywordSupport = () => {
  const title = getKeyword("https://json-schema.org/keyword/title");
  if (title) {
    title.annotation = title.annotation ?? identity;
  }

  const description = getKeyword("https://json-schema.org/keyword/description");
  if (description) {
    description.annotation = description.annotation ?? identity;
  }

  const _default = getKeyword("https://json-schema.org/keyword/default");
  if (_default) {
    _default.annotation = _default.annotation ?? identity;
  }

  const deprecated = getKeyword("https://json-schema.org/keyword/deprecated");
  if (deprecated) {
    deprecated.annotation = deprecated.annotation ?? identity;
  }

  const readOnly = getKeyword("https://json-schema.org/keyword/readOnly");
  if (readOnly) {
    readOnly.annotation = readOnly.annotation ?? identity;
  }

  const writeOnly = getKeyword("https://json-schema.org/keyword/writeOnly");
  if (writeOnly) {
    writeOnly.annotation = writeOnly.annotation ?? identity;
  }

  const examples = getKeyword("https://json-schema.org/keyword/examples");
  if (examples) {
    examples.annotation = examples.annotation ?? identity;
  }

  const format = getKeyword("https://json-schema.org/keyword/format");
  if (format) {
    format.annotation = format.annotation ?? identity;
  }

  const contentMediaType = getKeyword("https://json-schema.org/keyword/contentMediaType");
  if (contentMediaType) {
    contentMediaType.annotation = contentMediaType.annotation ?? identity;
  }

  const contentEncoding = getKeyword("https://json-schema.org/keyword/contentEncoding");
  if (contentEncoding) {
    contentEncoding.annotation = contentEncoding.annotation ?? identity;
  }

  const contentSchema = getKeyword("https://json-schema.org/keyword/contentSchema");
  if (contentSchema) {
    contentSchema.annotation = contentSchema.annotation ?? identity;
  }

  const unknown = getKeyword("https://json-schema.org/keyword/unknown");
  if (unknown) {
    unknown.annotation = unknown.annotation ?? identity;
  }
};

export { ValidationError } from "./validation-error.js";
