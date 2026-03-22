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
    console.log('🔐 Login attempt for email:', email);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email });
    console.log('👤 User found:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ User not found for email:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if user account is active
    if (!user.isActive) {
      console.log('❌ User account is deactivated:', email);
      return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
    }

    console.log('🔑 Auth Provider:', user.authProvider);
    console.log('🔐 User has password:', user.password ? 'YES' : 'NO');

    // Check if user has a password set
    if (!user.password) {
      console.log('❌ User has no password set (Google-only account)');
      return res.status(401).json({ message: `Please login with ${user.authProvider || 'Google'}` });
    }

    // Allow login if user has a password, regardless of authProvider
    const isMatch = await user.matchPassword(password);
    console.log('🔐 Password match:', isMatch ? 'YES' : 'NO');
    
    if (!isMatch) {
      console.log('❌ Password mismatch for user:', email);
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    console.log('✅ Login successful for:', email);
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
    console.error('❌ Login Error (Exception):', error.message, error.stack);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Google Sign-In
// @route   POST /api/users/google-signin
// @access  Public
const googleSignIn = async (req, res) => {
  try {
    const { email, name, googleIdToken } = req.body;

    if (!email || !googleIdToken) {
      return res.status(400).json({ message: 'Email and Google ID Token required' });
    }

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Check if user account is active
      if (!user.isActive) {
        return res.status(403).json({ message: 'Your account has been deactivated. Please contact support.' });
      }

      // User exists - allow login if they have local or google auth
      // Don't force users with local accounts to use only Google
      if (user.authProvider !== 'google' && user.authProvider !== 'local') {
        return res.status(401).json({ message: `Please login with ${user.authProvider}` });
      }
      // IMPORTANT: Do NOT change authProvider - allow users to use both methods
      // Only update Google ID token if they didn't have one
      if (!user.googleIdToken && user.authProvider !== 'google') {
        user.googleIdToken = googleIdToken;
      }
    } else {
      // Create new user with Google auth
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        authProvider: 'google',
        googleIdToken,
      });
    }

    await user.save();
    console.log('✅ Google Sign-In successful for:', email);

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
    console.error('❌ Google Sign-In Error:', error);
    res.status(400).json({ message: error.message });
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

// @desc    Deactivate/Activate user account (admin)
// @route   PUT /api/users/:userId/toggle-status
// @access  Admin
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Toggle the isActive status
    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: user.isActive ? 'User account activated' : 'User account deactivated',
      _id: user._id,
      name: user.name,
      email: user.email,
      isActive: user.isActive,
      role: user.role,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  googleSignIn,
  getMyProfile,
  updateProfile,
  updatePassword,
  savePushToken,
  removePushToken,
  getAllUsers,
  toggleUserStatus,
};