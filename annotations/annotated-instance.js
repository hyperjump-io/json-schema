import { JsInstance } from "../lib/instance.js";
import { getKeywordId } from "../lib/keywords.js";


const defaultDialectId = "https://json-schema.org/validation";

export class AnnotatedJsInstance extends JsInstance {
  constructor(instance, id = "") {
    super(instance, id);

    this.annotations = {};
  }

  annotation(keyword, dialectId = defaultDialectId) {
    const keywordId = getKeywordId(keyword, dialectId);
    return this.annotations[this.pointer]?.[keywordId] || [];
  }

  annotate(keyword, value) {
    const instance = Object.assign(Object.create(Object.getPrototypeOf(this)), this);
    instance.annotations = {
      ...this.annotations,
      [this.pointer]: {
        ...this.annotations[this.pointer],
        [keyword]: [
          value,
          ...this.annotations[this.pointer]?.[keyword] || []
        ]
      }
    };

    return instance;
  }

  annotatedWith(keyword, dialectId = defaultDialectId) {
    const instances = [];

    const keywordId = getKeywordId(keyword, dialectId);
    for (const instancePointer in this.annotations) {
      if (keywordId in this.annotations[instancePointer]) {
        instances.push(this.get(`#${instancePointer}`));
      }
    }

    return instances;
  }
}
