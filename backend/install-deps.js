const { execSync } = require('child_process');

console.log('📦 Installing node-cron dependency...');

try {
  execSync('npm install node-cron@3.0.3', { stdio: 'inherit' });
  console.log('✅ node-cron installed successfully!');
  console.log('\n🚀 You can now run the test file with:');
  console.log('   node test-class-reminders.js');
  console.log('\n📋 Available commands:');
  console.log('   node test-class-reminders.js          # Run all tests');
  console.log('   node test-class-reminders.js generate # Generate reminders for all students');
  console.log('   node test-class-reminders.js send     # Send pending notifications');
  console.log('   node test-class-reminders.js stats    # Show reminder statistics');
  console.log('   node test-class-reminders.js cleanup  # Clean up old reminders');
  console.log('   node test-class-reminders.js test     # Create test reminder and send it');
} catch (error) {
  console.error('❌ Error installing node-cron:', error.message);
} 