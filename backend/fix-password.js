const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = require('./models/User');

async function fixPassword() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connection.asPromise();
    console.log('✅ Connected to MongoDB');

    // Generate hash for "demo123"
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('demo123', salt);
    
    console.log('🔐 Generated hash for "demo123":', hashedPassword);

    // Update the super admin user
    const result = await User.findOneAndUpdate(
      { email: 'hod@demo.com' },
      { password: hashedPassword },
      { new: true }
    );

    if (result) {
      console.log('✅ Successfully updated super admin password');
      console.log('📧 Email:', result.email);
      console.log('👤 Name:', result.firstName, result.lastName);
      console.log('🎭 Role:', result.role);
    } else {
      console.log('❌ Super admin user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixPassword(); 