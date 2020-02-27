const subscribers = {};

const publish = (message, data) => {
  subscribers[message].forEach((subscriber) => subscriber(message, data));
};

const subscribe = (message, subscriber) => {
  if (!(message in subscribers)) {
    subscribers[message] = [];
  }
  subscribers[message].push(subscriber);
};

module.exports = { publish, subscribe };
