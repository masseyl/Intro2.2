import { NextResponse } from 'next/server';
import DatabaseService from '../../services/databaseService';
import { COLLECTIONS } from '../../../../lib/consts';

export async function POST(request: Request) {
  try {
    const dbService = await DatabaseService.getInstance();
    console.log('Database service initialized');

    // Assume profiles are sent in the request body
    const { profiles } = await request.json();

    if (!profiles || profiles.length === 0) {
      console.log('No profiles provided');
      return NextResponse.json({ message: 'No profiles to upsert' }, { status: 400 });
    }

    const upsertPromises = profiles.map(async (profile: any) => {
      console.log(`Upserting profile for user: ${profile.email}`);

      const upsertData = {
        ...profile,
        updatedAt: new Date()
      };

      const result = await dbService.collection(COLLECTIONS.PROFILES).updateOne(
        { email: profile.email },
        { $set: upsertData },
        { upsert: true }
      );
      console.log('Database update result:', result);
    });

    await Promise.all(upsertPromises);

    return NextResponse.json({ message: 'Profiles upserted successfully' });
  } catch (error: any) {
    console.error('Error upserting profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
