# 🚀 Quick Testing Guide - Notifications System

## ✅ What's Ready to Test

### 1. **Super Admin Notifications Page**
- **URL**: `/dashboard/super-admin/notifications`
- **Features**: Send notifications to all users, view received/sent notifications
- **Access**: Super admin login required

### 2. **Teacher Notifications Page**
- **URL**: `/dashboard/teacher/notifications`
- **Features**: Send notifications to students, view received/sent notifications
- **Access**: Teacher login required

### 3. **Push Notification Setup**
- **Component**: Available on both pages
- **Features**: Enable/disable push notifications, FCM token management

## 🧪 Testing Steps

### Step 1: Access Notifications Page
1. Login as super-admin or teacher
2. Click "Notifications" in the sidebar
3. You should see the notifications dashboard

### Step 2: Test Send Notification
1. Go to "Send Notification" tab
2. Fill in the form:
   - **Title**: "Test Notification"
   - **Message**: "This is a test notification"
   - **Target**: Choose "All Students" or "All Teachers"
   - **Priority**: Normal
3. Click "Send Notification"
4. Check for success message

### Step 3: Test Push Notifications (Optional)
1. In the sidebar, find "Mobile Push Notifications" card
2. Toggle "Enable Push Notifications"
3. Grant browser permission when prompted
4. Send a test notification
5. Check if you receive browser notification

### Step 4: View Notifications
1. Go to "Received" tab to see notifications sent to you
2. Go to "Sent" tab to see notifications you've sent
3. Test "Mark as Read" functionality

## 🔧 Backend Testing

### Test API Endpoints
```bash
# Get notifications
GET /api/notifications

# Send notification
POST /api/notifications
{
  "title": "Test",
  "message": "Test message",
  "targetType": "all_students",
  "targetValue": "",
  "priority": "normal"
}

# Update FCM token
POST /api/notifications/fcm-token
{
  "fcmToken": "test-token"
}
```

## 📱 Mobile Testing

### Browser Notifications
1. Open the app on mobile browser
2. Enable push notifications
3. Send test notification
4. Check if notification appears

### Desktop Notifications
1. Open the app on desktop
2. Enable push notifications
3. Send test notification
4. Check if notification appears

## 🐛 Common Issues & Solutions

### Issue: "Failed to fetch notifications"
**Solution**: Check if backend is running and API routes are working

### Issue: "Push notifications not working"
**Solution**: 
1. Check browser permissions
2. Verify service worker is registered
3. Check console for errors

### Issue: "No notifications showing"
**Solution**:
1. Check if notifications were actually sent
2. Verify user permissions
3. Check API responses

## 📊 Expected Behavior

### Super Admin
- Can send to: All students, all teachers, specific years, specific sections
- Can view: All received and sent notifications
- Can manage: Push notification settings

### Teacher
- Can send to: Their students, specific sections they teach
- Can view: Received notifications and their sent notifications
- Can manage: Push notification settings

### Students
- Can receive: Notifications from teachers and admins
- Can view: Received notifications only
- Can manage: Push notification settings

## 🎯 Test Scenarios

### Scenario 1: Super Admin Broadcast
1. Login as super-admin
2. Send notification to "All Students"
3. Login as student
4. Check if notification appears in received tab

### Scenario 2: Teacher to Section
1. Login as teacher
2. Send notification to specific section
3. Login as student in that section
4. Check if notification appears

### Scenario 3: Push Notifications
1. Enable push notifications on multiple devices
2. Send test notification
3. Check if all devices receive notification

## 📝 Test Checklist

- [ ] Can access notifications page
- [ ] Can send notification
- [ ] Can view received notifications
- [ ] Can view sent notifications
- [ ] Can mark notifications as read
- [ ] Can enable/disable push notifications
- [ ] Push notifications work (if Firebase configured)
- [ ] Notifications appear in correct tabs
- [ ] Error handling works
- [ ] Loading states work

## 🚀 Ready to Test!

The notification system is fully implemented and ready for testing. Start with the super-admin notifications page and work your way through the test scenarios above.

**Note**: Push notifications will work once Firebase is configured, but the rest of the system works without Firebase setup. 