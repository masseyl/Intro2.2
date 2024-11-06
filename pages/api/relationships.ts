import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from "next-auth/next"
import { authOptions } from "./auth/[...nextauth]"
import dbConnect from '@/lib/dbConnect'
import Relationship from '@/models/Relationship'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  await dbConnect()

  switch (req.method) {
    case 'GET':
      try {
        const relationships = await Relationship.find({ userId: session.userId })
        res.status(200).json(relationships)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch relationships' })
      }
      break

    case 'POST':
      try {
        const relationship = new Relationship({
          userId: session.userId,
          ...req.body,
        })
        await relationship.save()
        res.status(201).json(relationship)
      } catch (error) {
        res.status(500).json({ error: 'Failed to create relationship' })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}
