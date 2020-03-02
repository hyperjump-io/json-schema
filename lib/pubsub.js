const subscribers = {};

const publish = (message, data) => {
  if (message in subscribers) {
    subscribers[message](message, data);
  }
};

const subscribe = (message, subscriber) => {
  subscribers[message] = subscriber;
};

module.exports = { publish, subscribe };
