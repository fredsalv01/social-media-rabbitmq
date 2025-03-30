const amqp = require("amqplib");
const logger = require("./logger");

let connection = null;
let channel = null;

const EXCHANGE_NAME = "facebook_events";

async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", { durable: false });
    logger.info("Connected to RabbitMQ");
    return channel;
  } catch (error) {
    logger.error("Error while connecting to RabbitMQ", error);
  }
}

async function publishEvent(routingKey, message) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    await channel.publish(
      EXCHANGE_NAME,
      routingKey,
      Buffer.from(JSON.stringify(message))
    );
    logger.info(`Event published to RabbitMQ with routing key: ${routingKey}`);
  } catch (error) {
    logger.error("Error while publishing event to RabbitMQ", error);
  }
}

async function consumeEvent( routingKey, callback) {
  try {
    if (!channel) {
      await connectRabbitMQ();
    }
    const q = await channel.assertQueue("", { exclusive: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, routingKey);
    logger.info(`Waiting for messages in queue: ${q.queue}`);
    channel.consume(q.queue, (msg) => {
      if (msg !== null) {
        const content = JSON.parse(msg.content.toString());
        callback(content);
        channel.ack(msg);
      }
    });
    logger.info(`Subscribed to event: ${routingKey}`);
  } catch (error) {
    logger.error("Error while consuming event from RabbitMQ", error);
  }
}

module.exports = {
  connectRabbitMQ,
  publishEvent,
  consumeEvent,
};
