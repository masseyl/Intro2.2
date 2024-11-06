import mongoose from 'mongoose'

const RelationshipSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  contactName: { type: String, required: true },
  emailCount: { type: Number, default: 0 },
  lastInteraction: { type: Date },
})

export default mongoose.models.Relationship || mongoose.model('Relationship', RelationshipSchema)
