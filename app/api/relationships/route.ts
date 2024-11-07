import { NextResponse } from 'next/server'
import { getRelationships, addRelationship } from '../../../lib/mongodbUtils'

export async function GET() {
  try {
    const relationships = await getRelationships()
    return NextResponse.json(relationships)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const relationship = await request.json()
    const result = await addRelationship(relationship)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
