const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true },
    email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 6 },
    avatar: {
      url: { type: String, default: '' },
      public_id: { type: String, default: '' },
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    googleId: { type: String },
    facebookId: { type: String },
    authProvider: { type: String, enum: ['local', 'google', 'facebook'], default: 'local' },
    expoPushTokens: [
      {
        token: { type: String },
        device: { type: String },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    phone: { type: String, default: '' },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      province: { type: String, default: '' },
      zip: { type: String, default: '' },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);