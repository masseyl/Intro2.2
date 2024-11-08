import { NextRequest, NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

async function generateEmbeddingWithSlidingWindow(messages: any[], windowSize: number, overlap: number) {
  const aggregatedContent = messages.map(message => message.body).join(' '); // Focus on message bodies
  const tokens = aggregatedContent.split(' '); // Split content into tokens
  const embeddings = [];
  
  for (let start = 0; start < tokens.length; start += (windowSize - overlap)) {
    const end = Math.min(start + windowSize, tokens.length);
    const chunk = tokens.slice(start, end).join(' ');

    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: chunk,
    });

    if (response.data && response.data[0].embedding) {
      embeddings.push(response.data[0].embedding);
    }
  }

  if (embeddings.length === 0) {
    throw new Error('No embeddings generated');
  }

  return aggregateEmbeddings(embeddings);
}

// Function to aggregate embeddings
function aggregateEmbeddings(embeddings: any[]): any {
  if (embeddings.length === 0) {
    throw new Error('No embeddings to aggregate');
  }

  const numEmbeddings = embeddings.length;
  const aggregated = embeddings.reduce((acc, embedding) => {
    return acc.map((value, index) => value + embedding[index]);
  }, new Array(embeddings[0].length).fill(0));

  return aggregated.map(value => value / numEmbeddings);
}

export async function POST(req: NextRequest) {
  const { messages } = await req.json();

  try {
    // Generate a single embedding for all message bodies using sliding window
    const embedding = await generateEmbeddingWithSlidingWindow(messages, 2000, 500);
    return NextResponse.json({ embedding });
  } catch (error) {
    console.error('Error generating embedding:', error);
    return NextResponse.json({ error: 'Failed to generate embedding' }, { status: 500 });
  }
} 