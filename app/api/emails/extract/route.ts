import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import clientPromise from '../../../../lib/mongodb';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper function to clean JSON response
function cleanJsonResponse(content: string): string {
  // Remove markdown formatting
  return content
    .replace(/```json\s*/g, '')  // Remove opening ```json
    .replace(/```\s*$/g, '')     // Remove closing ```
    .replace(/^```\s*/g, '')     // Remove any remaining ``` marks
    .trim();
}

async function generateProfile(emails: any[]) {
  const combinedEmails = emails.map(email => `
From: ${email.sender?.name || 'Unknown'} <${email.sender?.email || 'Unknown'}>
Subject: ${email.subject || 'No Subject'}
Body: ${email.body}
---
`).join('\n');

  const prompt = `
As an expert in communication analysis and behavioral psychology, analyze these emails to create a detailed profile of the primary user. Focus on:

1. Personal characteristics (personality traits, writing style, professional background)
2. General demeanor and tone (formal/informal, friendly/professional, emotional range)
3. Interests (both professional and personal topics mentioned)
4. Communication style (direct/indirect, verbose/concise, use of language)

Emails:
"""${combinedEmails}"""

Provide a detailed analysis in JSON format. Be specific and avoid generic responses:
{
  "characteristics": "detailed description of personality traits and style",
  "demeanor": "specific observations about tone and approach",
  "interests": ["specific interest 1", "specific interest 2", "etc"],
  "communication_style": "detailed analysis of communication patterns"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert communication analyst. Return only valid JSON without any markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0].message?.content?.trim() || '{}';
    const cleanContent = cleanJsonResponse(content);
    
    try {
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON:', cleanContent);
      return {
        characteristics: 'Unable to analyze characteristics',
        demeanor: 'Unable to analyze demeanor',
        interests: ['Unable to determine interests'],
        communication_style: 'Unable to analyze communication style'
      };
    }
  } catch (error) {
    console.error('Error generating profile:', error);
    return {
      characteristics: 'Unable to analyze characteristics',
      demeanor: 'Unable to analyze demeanor',
      interests: ['Unable to determine interests'],
      communication_style: 'Unable to analyze communication style'
    };
  }
}

async function analyzeRelationship(emails: any[]) {
  const emailThreads = emails.map(email => `
From: ${email.sender?.name || 'Unknown'} <${email.sender?.email || 'Unknown'}>
To: ${email.recipients?.map((r: any) => `${r.name || 'Unknown'} <${r.email || 'Unknown'}>`).join(', ')}
Subject: ${email.subject || 'No Subject'}
Body: ${email.body}
---
`).join('\n');

  const prompt = `
As an expert in relationship dynamics and communication patterns, analyze these email exchanges to understand the relationship between the participants. Focus on:

1. Shared Interests and Topics:
   - Identify specific topics discussed
   - Note recurring themes or projects
   - Highlight common professional or personal interests

2. Personality Dynamics:
   - How do their communication styles complement or contrast?
   - What does their interaction reveal about their working relationship?
   - Are there signs of hierarchy, collaboration, or friendship?

3. Communication Pattern:
   - Analyze response times and engagement
   - Note the tone evolution across messages
   - Identify signs of rapport or tension

Emails:
"""${emailThreads}"""

Provide a detailed analysis in JSON format. Be specific and avoid generic responses:
{
  "shared_interests": ["specific interest 1", "specific interest 2", "etc"],
  "personality_overlaps": "detailed analysis of how their personalities interact",
  "sense_of_humor": "specific observations about their rapport and humor style",
  "interaction_quality": "detailed assessment of their relationship dynamics"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert relationship analyst. Return only valid JSON without any markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1500,
      temperature: 0.7
    });

    const content = response.choices[0].message?.content?.trim() || '{}';
    const cleanContent = cleanJsonResponse(content);
    
    try {
      return JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse JSON:', cleanContent);
      return {
        shared_interests: ['Unable to determine shared interests'],
        personality_overlaps: 'Unable to analyze personality dynamics',
        sense_of_humor: 'Unable to analyze rapport',
        interaction_quality: 'Unable to assess interaction quality'
      };
    }
  } catch (error) {
    console.error('Error analyzing relationships:', error);
    return {
      shared_interests: ['Unable to determine shared interests'],
      personality_overlaps: 'Unable to analyze personality dynamics',
      sense_of_humor: 'Unable to analyze rapport',
      interaction_quality: 'Unable to assess interaction quality'
    };
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  if (!session?.accessToken) {
    console.log("No access token found in session");
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const body = await request.json();
    
    if (!body.emails || !Array.isArray(body.emails)) {
      return NextResponse.json(
        { error: 'Invalid request: emails array is required' },
        { status: 400 }
      );
    }

    const { emails } = body;

    // First, extract email data
    const extractionPromises = emails.map(async (email: any) => {
      const emailText = extractEmailText(email);
      const extractedData = await extractEntities(emailText);

      // Save to database
      const client = await clientPromise;
      const db = client.db();
      await db.collection('emails').insertOne({
        ...extractedData,
        raw: email,
        userId: session.user?.id,
        createdAt: new Date()
      });

      return extractedData;
    });

    const extractedEmails = await Promise.all(extractionPromises);

    // Generate user profile
    const userProfile = await generateProfile(extractedEmails);
    
    // Save profile
    const client = await clientPromise;
    const db = client.db();
    await db.collection('profiles').updateOne(
      { userId: session.user?.id },
      { 
        $set: {
          ...userProfile,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    // Analyze relationships
    const relationships = await analyzeRelationship(extractedEmails);
    
    // Save relationship analysis
    await db.collection('relationships').updateOne(
      { userId: session.user?.id },
      { 
        $set: {
          analysis: relationships,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ 
      results: extractedEmails,
      profile: userProfile,
      relationships: relationships
    });
    
  } catch (error: any) {
    console.error('Error during processing:', error);
    return NextResponse.json(
      { error: 'Failed to process emails: ' + error.message },
      { status: 500 }
    );
  }
}

// Helper functions
function extractEmailText(email: any): string {
  // If this is a threaded message, combine all messages in the thread
  if (email.thread && email.thread.messages) {
    return email.thread.messages
      .map((message: any) => {
        const parts = message.payload?.parts || [];
        let encodedBody = '';

        const findPlainTextPart = (parts: any[]): any => {
          for (const part of parts) {
            if (part.mimeType === 'text/plain') {
              return part;
            } else if (part.parts) {
              const found = findPlainTextPart(part.parts);
              if (found) return found;
            }
          }
          return null;
        };

        const textPart = findPlainTextPart(parts);
        if (textPart) {
          encodedBody = textPart.body?.data || '';
        } else {
          encodedBody = message.payload?.body?.data || '';
        }

        const decodedBody = Buffer.from(encodedBody || '', 'base64').toString('utf-8');
        return decodedBody;
      })
      .join('\n\n--- Next Message ---\n\n');
  }

  // If not a thread, process as single message
  const parts = email.payload?.parts || [];
  let encodedBody = '';

  const findPlainTextPart = (parts: any[]): any => {
    for (const part of parts) {
      if (part.mimeType === 'text/plain') {
        return part;
      } else if (part.parts) {
        const found = findPlainTextPart(part.parts);
        if (found) return found;
      }
    }
    return null;
  };

  const textPart = findPlainTextPart(parts);
  if (textPart) {
    encodedBody = textPart.body?.data || '';
  } else {
    encodedBody = email.payload?.body?.data || '';
  }

  const decodedBody = Buffer.from(encodedBody || '', 'base64').toString('utf-8');
  return decodedBody;
}

async function extractEntities(emailText: string) {
  const prompt = `
Extract the following information from the email below. Return ONLY valid JSON with this exact structure:
{
  "sender": { "name": "", "email": "" },
  "recipients": [ { "name": "", "email": "" } ],
  "date": "",
  "subject": "",
  "body": ""
}

Email:
${emailText}`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant that extracts email information and returns it in valid JSON format only. Remove any markdown formatting.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: "json_object" } // Force JSON response
    });

    const content = response.choices[0].message?.content?.trim() || '{}';
    
    try {
      // Clean the content string
      const cleanContent = content
        .replace(/^```json\s*/, '') // Remove leading ```json
        .replace(/\s*```$/, '')     // Remove trailing ```
        .trim();
      
      const parsed = JSON.parse(cleanContent);
      
      // Ensure all required fields exist
      return {
        sender: parsed.sender || { name: '', email: '' },
        recipients: Array.isArray(parsed.recipients) ? parsed.recipients : [],
        date: parsed.date || '',
        subject: parsed.subject || '',
        body: parsed.body || emailText
      };
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Return a valid fallback object
      return {
        sender: { name: '', email: '' },
        recipients: [],
        date: '',
        subject: '',
        body: emailText
      };
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error('Failed to process email content');
  }
}
