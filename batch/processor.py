import os
from pymongo import MongoClient
import pandas as pd

# Configuration
MONGODB_URL = os.getenv('MONGODB_URL', 'mongodb://localhost:27017')
DB_NAME = 'analytics'

def run_batch_processing():
    print("Connecting to MongoDB...")
    client = MongoClient(MONGODB_URL)
    db = client[DB_NAME]
    events_coll = db['events']

    # Extract all events or query by a time range
    # In a real batch pipeline, you'd filter by timestamp: { '$gte': last_run, '$lt': current_run }
    cursor = events_coll.find({})
    
    events = list(cursor)
    if not events:
        print("No events found in database.")
        return

    print(f"Extracted {len(events)} events. Processing...")
    
    # Load into Pandas DataFrame for powerful batch aggregations
    df = pd.DataFrame(events)

    # Clean up _id for display
    if '_id' in df.columns:
        df['_id'] = df['_id'].astype(str)
        
    print("\n--- Summary of Event Types ---")
    print(df['eventType'].value_counts())

    print("\n--- Sample Sessions ---")
    session_counts = df['sessionId'].value_counts().head(5)
    print(session_counts)
    
    client.close()
    print("\nBatch processing complete.")

if __name__ == '__main__':
    run_batch_processing()
