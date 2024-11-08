import { MongoClient } from 'mongodb';
import { User, Relationship, RawEmail } from '../types';

export class DatabaseService {
  private static instance: DatabaseService;
  private client: MongoClient;
  
  private constructor(uri: string) {
    this.client = new MongoClient(uri);
  }

  static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      const uri = process.env.MONGODB_URI as string;
      DatabaseService.instance = new DatabaseService(uri);
      await DatabaseService.instance.client.connect();
    }
    return DatabaseService.instance;
  }

  async upsertProfile(profile: { 
    email: string, 
    name: string, 
    profile: {
      characteristics: string;
      demeanor: string;
      interests: string[];
      communication_style: string;
    }
  }) {
    const db = this.client.db(process.env.MONGODB_NAME || "MagicCRM");
    return db.collection('users').updateOne(
      { email: profile.email },
      { 
        $set: {
          ...profile,
          lastUpdated: new Date()
        }
      },
      { upsert: true }
    );
  }

  async upsertRelationship(relationship: {
    source: string;
    target: string;
    shared_interests: string[];
    connection_points: string[];
    relationship_strength: {
      score: number;
      reasoning: string;
    }
  }) {
    const db = this.client.db(process.env.MONGODB_NAME || "MagicCRM");
    return db.collection('relationships').updateOne(
      { 
        source: relationship.source,
        target: relationship.target
      },
      { 
        $set: {
          ...relationship,
          lastUpdated: new Date(),
          emailCount: relationship.emailCount || 0
        }
      },
      { upsert: true }
    );
  }

  async storeRawEmail(email: RawEmail) {
    const db = this.client.db(process.env.MONGODB_NAME || "MagicCRM");
    return db.collection('emails').insertOne({
      ...email,
      ingested: new Date()
    });
  }

  async getEmailsByUser(userEmail: string) {
    const db = this.client.db(process.env.MONGODB_NAME || "MagicCRM");
    return db.collection('emails')
      .find({ 'sender.email': userEmail })
      .toArray();
  }
} 