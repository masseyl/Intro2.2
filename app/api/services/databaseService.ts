import { MongoClient, Db } from 'mongodb';

class DatabaseService {
  private static instance: DatabaseService;
  private client: MongoClient;
  private db: Db | null = null;

  private constructor() {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined');
    this.client = new MongoClient(uri);
  }

  public static async getInstance(): Promise<DatabaseService> {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
      await DatabaseService.instance.connect();
    }
    return DatabaseService.instance;
  }

  private async connect() {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(process.env.MONGODB_NAME || 'MagicCRM');
    }
  }

  public collection(name: string) {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db.collection(name);
  }
}

export default DatabaseService; 