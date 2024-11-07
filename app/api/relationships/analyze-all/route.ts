import { NextResponse } from 'next/server';
import OpenAI from 'openai';

// Initialize the OpenAI client with your API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

function extractEmail(emailString: string): string {
  // Extract email from format "Name <email@domain.com>" or just "email@domain.com"
  const match = emailString.match(/<(.+?)>/) || [null, emailString];
  return match[1].toLowerCase();
}

export async function POST(request: Request) {
  try {
    const { profiles, emails } = await request.json();
    console.log('Received:', { 
      profileCount: profiles.length, 
      emailCount: emails.length 
    });
    
    const relationships = [];
    
    // Create interaction map
    const interactionMap = new Map();
    emails.forEach(email => {
      console.log('Processing email:', { 
        from: email.from, 
        to: email.to,
        subject: email.subject 
      });
      
      const sender = extractEmail(email.from);
      const recipients = Array.isArray(email.to) ? email.to : [email.to];
      
      recipients.forEach(recipient => {
        const recipientEmail = extractEmail(recipient);
        const pairKey = [sender, recipientEmail].sort().join('->');
        
        if (!interactionMap.has(pairKey)) {
          interactionMap.set(pairKey, []);
        }
        interactionMap.get(pairKey).push({
          from: email.from,
          to: recipient,
          subject: email.subject,
          body: email.snippet || email.body || '',
          date: email.date
        });
      });
    });

    console.log('Interaction map size:', interactionMap.size);
    console.log('Interaction pairs:', Array.from(interactionMap.keys()));

    // Generate relationships for each profile pair
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const personA = profiles[i];
        const personB = profiles[j];
        
        console.log('Analyzing pair:', {
          personA: personA.email,
          personB: personB.email
        });
        
        // Get interactions between this pair using just email addresses
        const pairKey = [
          personA.email.toLowerCase(),
          personB.email.toLowerCase()
        ].sort().join('->');
        
        const interactions = interactionMap.get(pairKey) || [];

        console.log('Found interactions:', interactions.length);

        if (interactions.length === 0) {
          console.log('Skipping pair - no interactions:', pairKey);
          continue;
        }

        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert relationship analyst. Return only valid JSON.'
            },
            {
              role: 'user',
              content: `Analyze the relationship between these two people based on their profiles and email interactions:

Person A: ${JSON.stringify(personA)}
Person B: ${JSON.stringify(personB)}

Email Interactions Sample:
${interactions.slice(0, 3).map(email => `
From: ${email.from}
To: ${email.to}
Subject: ${email.subject}
Content: ${email.body}
`).join('\n---\n')}

Return as JSON:
{
  "source": "${personA.email}",
  "target": "${personB.email}",
  "shared_interests": ["interest1", "interest2"],
  "connection_points": ["point1", "point2"],
  "relationship_strength": {
    "score": 1-10,
    "reasoning": "brief explanation"
  }
}`
            }
          ],
          temperature: 0.7
        });

        const relationship = JSON.parse(response.choices[0].message?.content || '{}');
        relationships.push(relationship);
        console.log('Added relationship:', relationship);
      }
    }

    return NextResponse.json({ success: true, relationships });
  } catch (error: any) {
    console.error('Error analyzing relationships:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
