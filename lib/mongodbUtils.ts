import { MongoClient } from 'mongodb'
import { COLLECTIONS } from './consts';

const uri = process.env.MONGODB_URI as string; // Ensure it's treated as a string
const options = {}

let client: MongoClient
let clientPromise: Promise<MongoClient>

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export async function getRelationships() {
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_NAME || "MagicCRM") // Replace with your database name
  return db.collection(COLLECTIONS.RELATIONSHIPS).find({}).toArray()
}

export async function addRelationship(relationship: { [key: string]: any }) { // Define the type as needed
  const client = await clientPromise
  const db = client.db(process.env.MONGODB_NAME || "MagicCRM") // Replace with your database name
  return db.collection(COLLECTIONS.RELATIONSHIPS).insertOne(relationship)
}
