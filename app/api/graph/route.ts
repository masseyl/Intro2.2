import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const users = await db.collection('users').find().toArray();
    const relationships = await db.collection('relationships').find().toArray();

    const nodes = users.map(user => ({
      id: user.email,
      label: user.name,
      ...user.profile,
    }));

    const edges = relationships.map(rel => ({
      from: rel.userAId,
      to: rel.userBId,
      value: rel.strength,
      ...rel.analysis,
    }));

    return NextResponse.json({ nodes, edges });
  } catch (error: any) {
    console.error('Error generating social graph:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
