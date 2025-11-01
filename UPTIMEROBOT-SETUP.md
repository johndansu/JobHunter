# 🔔 UptimeRobot Setup - Keep Backend Alive

## **Why You Need This**

Render's free tier spins down your backend after **15 minutes of inactivity**. This causes:
- ❌ Users get "network errors" when trying to search/register
- ❌ Backend takes 30+ seconds to wake up
- ❌ Poor user experience

**UptimeRobot** pings your backend every 5 minutes to keep it alive.

---

## **🚀 Quick Setup (5 Minutes)**

### **Step 1: Get Your Backend URL**

Your backend URL is:
```
https://jobhunter-backend1.onrender.com/health
```

Or find it in your Render dashboard.

---

### **Step 2: Sign Up for UptimeRobot**

1. Go to: https://uptimerobot.com
2. Click **"Sign Up Free"** (top right)
3. Create account with email/password
4. Free tier gives you **50 monitors** (more than enough!)

---

### **Step 3: Create a Monitor**

1. Click **"Add New Monitor"** (big green button)
2. Configure:

**Monitor Settings:**
- **Monitor Type:** `HTTP(s)`
- **Friendly Name:** `JobHunter Backend`
- **URL:** `https://jobhunter-backend1.onrender.com/health`

**Alert Settings:**
- **Alert Contacts:** (optional, leave blank for now)

**Monitoring Interval:**
- **Monitoring Interval:** `Every 5 minutes`

3. Click **"Create Monitor"** ✅

---

### **Step 4: Verify It's Working**

1. Wait 5 minutes after creating the monitor
2. Check UptimeRobot dashboard:
   - Status should be **"UP"** (green) ✅
   - Response time should show (usually 1-5 seconds)
3. Test your site - it should load instantly!

---

## **📊 How It Works**

```
Every 5 minutes:
┌─────────────┐
│ UptimeRobot │  
└──────┬──────┘
       │ GET /health
       ↓
┌──────────────────────────┐
│ Render Backend           │
│ Returns: OK              │  ← Keeps backend AWAKE! 💪
└──────────────────────────┘
```

---

## **🎯 Benefits**

✅ **Backend Always Awake** - No more spin-down delays  
✅ **Instant Load Times** - Users don't wait 30+ seconds  
✅ **Better SEO** - Google sees fast response times  
✅ **Free Forever** - 50 monitors at no cost  
✅ **Email Alerts** - Get notified if backend goes down  

---

## **🔔 Optional: Setup Email Alerts**

### **When Backend Goes Down:**

1. Click **"My Settings"** → **"Alert Contacts"**
2. Add your email
3. Go back to your monitor → **"Edit"**
4. Under **"Alert Contacts"** → Select your email
5. Save

Now you'll get emails like:
```
🚨 JobHunter Backend is DOWN!
Time: 2025-11-01 10:30 PM
URL: https://jobhunter-backend1.onrender.com/health
```

---

## **💰 Cost**

**FREE:**
- 50 monitors
- 5-minute checks
- Email/SMS alerts

**Paid Plans:**
- Faster checks (1-minute intervals)
- More monitors (unlimited)
- $7/month for pro features

**You don't need paid!** Free tier is perfect for keeping Render awake.

---

## **⚙️ Advanced Configuration**

### **Custom Interval:**

By default: **5 minutes** (perfect for Render)

Want faster?
- **1-2 minutes:** Costs money, not needed
- **5 minutes:** ✅ FREE, prevents spin-down
- **10-30 minutes:** ❌ Won't work, backend spins down in 15 min

---

## **🔍 Troubleshooting**

### **Monitor Shows "DOWN" (Red)**

**Possible Causes:**

1. **Backend not deployed yet:**
   - Go to Render dashboard → Check if backend is running
   - If not, deploy it first!

2. **Wrong URL:**
   - Verify URL in Render dashboard
   - Should end with `/health`

3. **Backend crashed:**
   - Check Render logs
   - Look for error messages
   - Restart backend

4. **DNS propagation:**
   - Wait 5-10 minutes
   - Refresh UptimeRobot page

---

### **"Paused" Status**

**Why it's paused:**
- UptimeRobot doesn't ping paused monitors
- **Action:** Click **"Resume"** button

---

### **High Response Times (30+ seconds)**

**This means:**
- Backend is spinning down → waking up
- **Solution:** Check that UptimeRobot is **active** and **"UP"**
- If it's green but still slow, increase ping frequency to every 2 minutes (paid tier)

---

## **✅ Checklist**

After setup, verify:

- [ ] UptimeRobot account created
- [ ] Monitor created for `/health` endpoint
- [ ] Status is **"UP"** (green)
- [ ] Checked every **5 minutes**
- [ ] Email alerts configured (optional)
- [ ] Tested site - loads instantly

---

## **🎉 Success!**

Your backend is now:
- ✅ Always awake
- ✅ Fast load times
- ✅ No more "network errors"
- ✅ Happy users!

---

## **📚 Related Docs**

- **Render Deployment:** See main README.md
- **Backend Health Check:** Server includes `/health` endpoint
- **Monitoring:** Check `server/src/index.ts` line 102

---

**Need Help?**

1. Check UptimeRobot docs: https://uptimerobot.com
2. Test backend manually: Visit `/health` in browser
3. Check Render logs: See what backend is doing

**You're all set! 🚀**

