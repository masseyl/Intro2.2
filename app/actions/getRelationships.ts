'use server'

import clientPromise from '@/lib/mongodb'

export async function getRelationships() {
  try {
    const client = await clientPromise
    const db = client.db("your_database_name")
    
    const relationships = await db
      .collection("relationships")
      .find({})
      .toArray()

    return relationships
  } catch (error) {
    console.error('Failed to fetch relationships:', error)
    return []
  }
} 