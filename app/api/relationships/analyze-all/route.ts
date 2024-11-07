import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { Configuration, OpenAIApi } from 'openai';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openai = new OpenAIApi(configuration);

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const users = await db.collection('users').find().toArray();

    const userPairs = [];

    // Generate all unique pairs of users
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        userPairs.push([users[i], users[j]]);
      }
    }

    const relationshipPromises = userPairs.map(async ([userA, userB]) => {
      const interactions = await db
        .collection('emails')
        .find({
          $or: [
            { 'sender.email': userA.email, 'recipients.email': userB.email },
            { 'sender.email': userB.email, 'recipients.email': userA.email },
          ],
        })
        .toArray();

      if (interactions.length === 0) {
        return null;
      }

      const analysis = await analyzeRelationship(interactions);
      const strength = await calculateConnectionStrength(analysis);

      // Save analysis to relationships collection
      await db.collection('relationships').updateOne(
        { userAId: userA.email, userBId: userB.email },
        { $set: { analysis, strength, updatedAt: new Date() } },
        { upsert: true }
      );

      return { userAId: userA.email, userBId: userB.email, analysis, strength };
    });

    await Promise.all(relationshipPromises);

    return NextResponse.json({ message: 'Relationships analyzed successfully' });
  } catch (error: any) {
    console.error('Error analyzing relationships:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
