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

    const interactions = await db
      .collection('emails')
      .find({
        $or: [
          { 'sender.email': userAId, 'recipients.email': userBId },
          { 'sender.email': userBId, 'recipients.email': userAId },
        ],
      })
      .toArray();

    if (interactions.length === 0) {
      return NextResponse.json(
        { error: 'No interactions found between these users' },
        { status: 404 }
      );
    }

    const analysis = await analyzeRelationship(interactions);

    // Save analysis to relationships collection
    await db.collection('relationships').updateOne(
      { userAId, userBId },
      { $set: { analysis, updatedAt: new Date() } },
      { upsert: true }
    );

    return NextResponse.json({ analysis });
  } catch (error: any) {
    console.error('Error analyzing relationship:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function
async function analyzeRelationship(interactions: any[]) {
  const combinedInteractions = interactions.map(email => email.body).join('\n\n');
  const prompt = `
Analyze the relationship between these two people based on their email exchanges.
Focus on identifying concrete connection points and relationship strength.

Emails:
"""${combinedInteractions}"""

Return as JSON:
{
  "shared_interests": ["specific interest 1", "specific interest 2"],
  "connection_points": ["specific trait or characteristic they share"],
  "interaction_style": "brief description of how they communicate",
  "relationship_strength": {
    "score": 1-10,
    "reasoning": "brief explanation"
  }
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are an expert relationship analyst. Return only valid JSON.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7
  });

  return JSON.parse(cleanJsonResponse(response.choices[0].message?.content || '{}'));
}
