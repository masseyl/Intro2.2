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
Analyze the relationship between User A and User B based on the following email exchanges:

Emails:
"""${combinedInteractions}"""

Determine:

- Shared interests
- Personality overlaps
- Sense of humor
- Quality of their interactions

Provide the analysis in JSON format:
{
  "shared_interests": [],
  "personality_overlaps": "",
  "sense_of_humor": "",
  "interaction_quality": ""
}
`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    max_tokens: 500,
    temperature: 0,
  });

  const analysis = JSON.parse(response.data.choices[0].text.trim());
  return analysis;
}
