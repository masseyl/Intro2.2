import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import { Configuration, OpenAIApi } from 'openai';
import { ObjectId } from 'mongodb';

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY!,
});
const openai = new OpenAIApi(configuration);

export async function POST() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const users = await db.collection('users').find().toArray();

    const profilePromises = users.map(async (user) => {
      const emails = await db
        .collection('emails')
        .find({ 'sender.email': user.email })
        .toArray();

      if (emails.length === 0) {
        return null;
      }

      const profile = await generateProfile(emails);

      // Save profile to users collection
      await db.collection('users').updateOne(
        { _id: new ObjectId(user._id) },
        { $set: { profile, updatedAt: new Date() } }
      );

      return profile;
    });

    await Promise.all(profilePromises);

    return NextResponse.json({ message: 'User profiles generated successfully' });
  } catch (error: any) {
    console.error('Error generating profiles:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
