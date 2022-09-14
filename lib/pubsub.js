const subscriptions = {};
let uid = 0;

const subscribe = (message, fn) => {
  if (!(message in subscriptions)) {
    subscriptions[message] = {};
  }

  const subscriptionId = `pubsub_subscription_${uid++}`;
  subscriptions[message][subscriptionId] = fn;

  return subscriptionId;
};

const unsubscribe = (message, token) => {
  delete subscriptions[message][token];
};

const publish = (message, data) => {
  for (const subscribedMessage in subscriptions) {
    if (subscribedMessage === message || message.startsWith(`${subscribedMessage}.`)) {
      for (const subscriptionId in subscriptions[subscribedMessage]) {
        subscriptions[subscribedMessage][subscriptionId](message, data);
      }
    }
  }
};

const publishAsync = async (message, data) => {
  const promises = [];
  for (const subscribedMessage in subscriptions) {
    if (subscribedMessage === message || message.startsWith(`${subscribedMessage}.`)) {
      for (const subscriptionId in subscriptions[subscribedMessage]) {
        promises.push(subscriptions[message][subscriptionId](message, data));
      }
    }
  }

  await Promise.all(promises);

  return;
};

module.exports = { subscribe, unsubscribe, publish, publishAsync };
