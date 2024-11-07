import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import clientPromise from '../../../../../lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const sendUpdate = async (type: string, data: any) => {
    await writer.write(
      encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
    );
  };

  try {
    const client = await clientPromise;
    const db = client.db();

    // Get all unique email senders
    const uniqueSenders = await db.collection('emails').distinct('sender.email');
    const totalUsers = uniqueSenders.length;
    
    for (let i = 0; i < uniqueSenders.length; i++) {
      const userEmail = uniqueSenders[i];
      
      // Get all emails sent by this user
      const userEmails = await db.collection('emails')
        .find({ 'sender.email': userEmail })
        .toArray();

      if (userEmails.length === 0) continue;

      // Generate profile using OpenAI
      const prompt = `Analyze the following email data and create a detailed user profile.
      
      Emails:
      ${userEmails.map(email => `
        Subject: ${email.subject}
        Body: ${email.body}
      `).join('\n---\n')}

      Create a detailed profile including:
      1. Communication style
      2. Professional interests
      3. Personality traits
      4. Common topics discussed
      
      Return as JSON:
      {
        "communication_style": "detailed description",
        "interests": ["interest1", "interest2", ...],
        "personality_traits": ["trait1", "trait2", ...],
        "common_topics": ["topic1", "topic2", ...]
      }`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an expert in analyzing communication patterns and creating user profiles.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7
      });

      const profile = JSON.parse(response.choices[0].message.content);

      // Store profile in database
      await db.collection('users').updateOne(
        { email: userEmail },
        { 
          $set: { 
            profile,
            lastProfileUpdate: new Date()
          }
        },
        { upsert: true }
      );

      // Send progress update
      await sendUpdate('profile', {
        processed: i + 1,
        total: totalUsers,
        latest: { email: userEmail, profile }
      });
    }

    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    await sendUpdate('error', { message: error.message });
    await writer.close();
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }
} 