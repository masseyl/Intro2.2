import { NextResponse } from 'next/server';
import { Configuration, OpenAIApi } from 'openai';
import clientPromise from '../../../../../lib/mongodb';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openai = new OpenAIApi(configuration);

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const userId = params.id;
    const emails = await db
      .collection('emails')
      .find({ 'sender.email': userId })
      .toArray();

    if (emails.length === 0) {
      return NextResponse.json(
        { error: 'No emails found for this user' },
        { status: 404 }
      );
    }

    const profile = await generateProfile(emails);

    // Save profile to users collection
    await db.collection('users').updateOne(
      { _id: new ObjectId(userId) },
      { $set: { profile, updatedAt: new Date() } }
    );

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error generating profile:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function
async function generateProfile(emails: any[]) {
  const combinedEmails = emails.map(email => email.body).join('\n\n');
  const prompt = `
Based on the following email texts, create a profile for the user including:

- Personal characteristics
- General demeanor and tone
- Interests
- Communication style

Emails:
"""${combinedEmails}"""

Provide the profile in JSON format:
{
  "characteristics": "",
  "demeanor": "",
  "interests": [],
  "communication_style": ""
}
`;

  const response = await openai.createCompletion({
    model: 'text-davinci-003',
    prompt: prompt,
    max_tokens: 500,
    temperature: 0,
  });

  const profile = JSON.parse(response.data.choices[0].text.trim());
  return profile;
}
