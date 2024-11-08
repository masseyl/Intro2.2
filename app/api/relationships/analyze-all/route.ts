import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import DatabaseService from '../../services/databaseService';
import { COLLECTIONS } from '../../../../lib/consts';

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
    
    const relationships = [];
    
    // Create interaction map
    const interactionMap = new Map();
    emails.forEach(email => {
      
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


    // Generate relationships for each profile pair
    for (let i = 0; i < profiles.length; i++) {
      for (let j = i + 1; j < profiles.length; j++) {
        const personA = profiles[i];
        const personB = profiles[j];
        
        
        // Get interactions between this pair using just email addresses
        const pairKey = [
          personA.email.toLowerCase(),
          personB.email.toLowerCase()
        ].sort().join('->');
        
        const interactions = interactionMap.get(pairKey) || [];


        if (interactions.length === 0) {
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
          temperature: 0.7,
          response_format: { type: "json_object" }
        });

        let relationship;
        try {
          const content = response.choices[0].message?.content || '{}';
          relationship = JSON.parse(content.trim());
          
          // Generate embedding for the relationship
          const embeddingResponse = await openai.embeddings.create({
            model: "text-embedding-3-small",
            input: JSON.stringify({
              shared_interests: relationship.shared_interests,
              connection_points: relationship.connection_points,
              relationship_description: relationship.description
            })
          });


          const db = await DatabaseService.getInstance();
          const result = await db.collection(COLLECTIONS.RELATIONSHIPS).updateOne(
            {
              source: relationship.source,
              target: relationship.target
            },
            {
              $set: {
                ...relationship,
                embedding: embeddingResponse.data[0].embedding,
                emailCount: interactions.length,
                lastInteraction: new Date(Math.max(...interactions.map(i => new Date(i.date).getTime()))),
                updatedAt: new Date()  // Add this to track when records are updated
              }
            },
            { upsert: true }
          );

          relationships.push(relationship);
        } catch (e) {
          // Enhance error logging
          console.error('Database operation error:', {
            error: e,
            relationship: relationship,
            stack: e.stack
          });
          throw e;
        }
      }
    }

    return NextResponse.json({ success: true, relationships });
  } catch (error: any) {
    console.error('Error analyzing relationships:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
