const { MongoClient } = require('mongodb');

const url = 'mongodb://localhost:27017';
const dbName = 'analytics';

async function setup() {
  const client = new MongoClient(url);

  try {
    await client.connect();
    console.log('Connected successfully to MongoDB server');
    const db = client.db(dbName);

    // Create collections with schema validation
    await db.createCollection('events', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['projectId', 'sessionId', 'eventType', 'timestamp', 'page'],
          properties: {
            projectId: {
              bsonType: 'string',
              description: 'must be a string and is required'
            },
            sessionId: {
              bsonType: 'string',
              description: 'must be a string and is required'
            },
            eventType: {
              enum: ['click', 'scroll', 'pageview'],
              description: 'must be either click, scroll, or pageview'
            },
            timestamp: {
              bsonType: 'number',
              description: 'must be a number and is required'
            },
            page: {
              bsonType: 'object',
              required: ['url'],
              properties: {
                url: {
                  bsonType: 'string',
                  description: 'must be a string and is required'
                }
              }
            },
            device: {
              bsonType: 'object',
              properties: {
                type: { bsonType: 'string' },
                viewport: {
                  bsonType: 'object',
                  properties: {
                    width: { bsonType: 'number' },
                    height: { bsonType: 'number' }
                  }
                }
              }
            },
            metadata: {
              bsonType: 'object',
              description: 'additional properties specific to event type'
            }
          }
        }
      }
    });

    console.log('Created "events" collection with schema validation');

    // Create indexes
    const collection = db.collection('events');
    await collection.createIndex({ projectId: 1 });
    await collection.createIndex({ sessionId: 1 });
    await collection.createIndex({ timestamp: -1 });

    console.log('Created indexes correctly');
  } catch (err) {
    console.error('Error during setup:', err);
  } finally {
    await client.close();
  }
}

setup();
