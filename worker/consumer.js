require('dotenv').config();
const amqp = require('amqplib');
const { MongoClient } = require('mongodb');

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://user:password@localhost:5672';
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const QUEUE_NAME = 'events_queue';
const DB_NAME = process.env.DB_NAME || 'analytics';

async function startWorker() {
  let client;
  try {
    // 1. Connect to MongoDB
    client = new MongoClient(MONGODB_URL);
    await client.connect();
    console.log('Connected to MongoDB');
    const db = client.db(DB_NAME);
    const eventsCollection = db.collection('events');

    // 2. Connect to RabbitMQ
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();
    
    // Ensure queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    
    // Process one message at a time to ensure reliable processing without overwhelming the db
    channel.prefetch(10);
    
    console.log(`Worker waiting for messages in ${QUEUE_NAME}...`);

    // 3. Consume messages
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const eventString = msg.content.toString();
          const eventData = JSON.parse(eventString);
          console.log(`[Worker] Received event: ${eventData.eventType} from project ${eventData.projectId}`);

          // Insert into Database
          await eventsCollection.insertOne(eventData);

          // Acknowledge the message only after successfully saving to DB
          channel.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          // Standard practice is to nack and perhaps move to a Dead Letter Exchange
          // Here we just nack and requeue it (or discard if invalid JSON. It depends on error)
          // To keep it simple, we reject invalid formats without requeuing to avoid loops
          if (error.name === 'SyntaxError') {
             console.error("Invalid json, discarding message");
             channel.ack(msg); // Discard bad JSON
          } else {
             // System error like DB unavailable - wait a moment before nacking to delay retry
             setTimeout(() => channel.nack(msg), 2000); 
          }
        }
      }
    });

  } catch (error) {
    console.error('Worker failed to start:', error);
    if (client) {
      await client.close();
    }
    process.exit(1);
  }
}

startWorker();
