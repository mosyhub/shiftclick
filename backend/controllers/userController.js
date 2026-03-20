const User = require('../models/User');
const { generateToken } = require('../middleware/authMiddleware');
const { cloudinary } = require('../config/cloudinary');

// @desc    Register user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    console.log('📝 Register request received:', req.body);
    
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ 
      name, 
      email, 
      password, 
      authProvider: 'local',
      role: role === 'admin' ? 'admin' : 'user'  // Set role, default to 'user'
    });
    console.log('✅ User created successfully:', user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('❌ Register Error:', error);
    res.status(400).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.authProvider !== 'local') {
      return res.status(401).json({ message: `Please login with ${user.authProvider}` });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      phone: user.phone,
      address: user.address,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get my profile
// @route   GET /api/users/me
// @access  Private
const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper function to upload file to Cloudinary
const uploadToCloudinary = (buffer, filename) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'shiftclick/avatars', resource_type: 'auto' },
      (error, result) => {
        if (error) reject(error);
        else resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    stream.end(buffer);
  });
};

// @desc    Update profile
// @route   PUT /api/users/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { name, phone, address } = req.body;
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = typeof address === 'string' ? JSON.parse(address) : address;

    if (req.file) {
      if (user.avatar?.public_id) await cloudinary.uploader.destroy(user.avatar.public_id);
      const uploadedAvatar = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      user.avatar = uploadedAvatar;
    }

    const updated = await user.save();
    res.json({
      _id: updated._id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      avatar: updated.avatar,
      phone: updated.phone,
      address: updated.address,
      token: generateToken(updated._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update password
// @route   PUT /api/users/password
// @access  Private
const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) return res.status(401).json({ message: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Save push token
// @route   POST /api/users/push-token
// @access  Private
const savePushToken = async (req, res) => {
  try {
    const { token, device } = req.body;
    const user = await User.findById(req.user._id);
    user.expoPushTokens = user.expoPushTokens.filter((t) => t.token !== token);
    user.expoPushTokens.push({ token, device, updatedAt: new Date() });
    await user.save();
    res.json({ message: 'Push token saved' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Remove push token
// @route   DELETE /api/users/push-token
// @access  Private
const removePushToken = async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user._id);
    user.expoPushTokens = user.expoPushTokens.filter((t) => t.token !== token);
    await user.save();
    res.json({ message: 'Push token removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all users (admin)
// @route   GET /api/users
// @access  Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getMyProfile,
  updateProfile,
  updatePassword,
  savePushToken,
  removePushToken,
  getAllUsers,
};