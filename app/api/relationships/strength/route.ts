import { NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';
import clientPromise from '../../../../lib/mongodb';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openai = new OpenAIApi(configuration);

export async function POST(request: Request) {
  try {
    const { userAId, userBId } = await request.json();
    const client = await clientPromise;
    const db = client.db();

    const relationship = await db
      .collection('relationships')
      .findOne({ userAId, userBId });

    if (!relationship || !relationship.analysis) {
      return NextResponse.json(
        { error: 'Relationship analysis not found' },
        { status: 404 }
      );
    }

    const strength = await calculateConnectionStrength(relationship.analysis);

    // Update relationship with strength
    await db.collection('relationships').updateOne(
      { userAId, userBId },
      { $set: { strength, updatedAt: new Date() } }
    );

    return NextResponse.json({ strength });
  } catch (error: any) {
    console.error('Error calculating connection strength:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function
async function calculateConnectionStrength(analysis: any) {
  const prompt = `
Based on the following relationship analysis, rate the strength of the connection between User A and User B on a scale from 1 to 10.

Relationship Analysis:
"""${JSON.stringify(analysis)}"""

Provide the strength as a single number.

Strength:
`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    max_tokens: 10,
    temperature: 0,
  });

  const strength = parseFloat(response.data.choices[0].text.trim());
  return strength;
}
