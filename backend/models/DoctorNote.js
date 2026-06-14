import mongoose from 'mongoose'

const DoctorNoteSchema = new mongoose.Schema(
  {
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SymptomEntry',
      required: true,
      index: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    doctorName: { type: String, required: true },
    note: { type: String, required: true, maxlength: 2000 },
    // private = only doctor sees it; shared = patient also sees it
    visibility: {
      type: String,
      enum: ['private', 'shared'],
      default: 'shared',
    },
  },
  { timestamps: true },
)

export default mongoose.model('DoctorNote', DoctorNoteSchema)
