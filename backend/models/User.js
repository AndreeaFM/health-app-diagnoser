import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Invalid email'],
    },
    passwordHash: { type: String, required: true },
    dateOfBirth: { type: Date },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say'],
    },
    medicalHistory: { type: [String], default: [] },
    allergies: { type: [String], default: [] },
    profileComplete: { type: Boolean, default: false },
    emergencyContact: {
      name: { type: String, default: '' },
      email: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    reminderEnabled: { type: Boolean, default: false },
  },
  { timestamps: true }
)

export default mongoose.model('User', UserSchema)
