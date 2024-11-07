import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Fetch all users with profiles
    const profiles = await db.collection('users')
      .find({ profile: { $exists: true } })
      .project({
        email: 1,
        profile: 1,
        lastProfileUpdate: 1,
        _id: 0
      })
      .toArray();

    return NextResponse.json(profiles);
  } catch (error: any) {
    console.error('Error fetching profiles:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 