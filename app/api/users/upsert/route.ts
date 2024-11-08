import { NextResponse } from 'next/server';
import DatabaseService from '../../services/databaseService';
    import { COLLECTIONS } from '../../../../lib/consts';

export async function POST(request: Request) {
  try {
    const dbService = await DatabaseService.getInstance();
    console.log('Database service initialized');

    const { users } = await request.json();

    if (!users || users.length === 0) {
      console.log('No user data provided');
      return NextResponse.json({ message: 'No user data to upsert' }, { status: 400 });
    }

    const upsertPromises = users.map(async (user: any) => {
      console.log(`Upserting user: ${user.email}`);

      const upsertData = {
        name: user.name,
        emails: user.emails,
        embedding: user.embedding,
        updatedAt: new Date()
      };

      const result = await dbService.collection(COLLECTIONS.USERS).updateOne(
        { email: user.email },
        { $set: upsertData },
        { upsert: true }
      );
      console.log('Database update result:', result);
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({ message: 'Users upserted successfully' });
  } catch (error: any) {
    console.error('Error upserting users:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 