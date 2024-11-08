import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_NAME);

    const relationships = await db.collection('relationships')
      .find({}, {
        projection: {
          source: 1,
          target: 1,
          emailCount: 1,
          connection_points: 1,
          'relationship_strength.score': 1
        }
      })
      .toArray();

    // Get unique nodes and create proper node objects with ids and labels
    const uniqueEmails = [...new Set(relationships.flatMap(r => [r.source, r.target]))];
    const nodes = uniqueEmails.map(email => ({
      id: email,
      label: email.split('@')[0], // Just show the part before @ for display
    }));

    // Format edges with required properties
    const edges = relationships.map(r => ({
      source: r.source,
      target: r.target,
      value: r.emailCount, // Use emailCount for edge thickness
      strength: r.relationship_strength.score,
      connection_points: r.connection_points
    }));
    
    return NextResponse.json({
      nodes,
      edges
    });

  } catch (error: any) {
    console.error('Error generating social graph:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
