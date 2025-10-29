# 💰 Affiliate Revenue Setup Guide

This guide will help you set up affiliate links to monetize your job board while keeping it **100% FREE** for job seekers.

## **How It Works**

1. User searches for jobs on your platform (FREE)
2. User clicks "Apply Now" on a job listing
3. They're redirected through your affiliate link
4. You earn $0.10 - $20 per click/application
5. **User pays $0** - completely free for them!

---

## **📋 Affiliate Programs to Join**

### **1. ZipRecruiter Affiliate Program** ⭐ HIGHEST PAYING
**Payout:** $5-20 per application  
**Approval:** Easy, usually instant

**How to Sign Up:**
1. Go to: https://www.ziprecruiter.com/publishers
2. Click "Join the Program"
3. Fill out application form
4. Get your affiliate ID (looks like: `zr123456`)
5. Add to `.env`: `ZIPRECRUITER_AFFILIATE_ID=zr123456`

---

### **2. Indeed Publisher Program** ⭐ EASY APPROVAL
**Payout:** $0.10-$3 per click  
**Approval:** Instant, no application review

**How to Sign Up:**
1. Go to: https://www.indeed.com/publishers
2. Create a publisher account
3. Get your Publisher ID
4. Add to `.env`: `INDEED_PUBLISHER_ID=your-publisher-id`

---

### **3. FlexJobs Affiliate Program** ⭐ HIGH COMMISSION
**Payout:** 50% commission ($29.95 per sale)  
**Approval:** Moderate, review within 1-2 days

**How to Sign Up:**
1. Go to: https://www.flexjobs.com/affiliates
2. Apply to join the affiliate program
3. Get approved (usually 1-2 days)
4. Get your affiliate ID
5. Add to `.env`: `FLEXJOBS_AFFILIATE_ID=your-affiliate-id`

---

### **4. LinkedIn Jobs Partner Program**
**Payout:** $5-15 per click  
**Approval:** Moderate, requires application

**How to Sign Up:**
1. Go to: https://www.linkedin.com/help/linkedin/answer/116984
2. Apply for the partner program
3. Wait for approval (1-2 weeks)
4. Get your partner/ref ID
5. Add to `.env`: `LINKEDIN_PARTNER_ID=your-partner-id`

---

### **5. Remote.ok Affiliate**
**Payout:** Commission per application  
**Approval:** Easy

**How to Sign Up:**
1. Visit: https://remoteok.com/remote-work
2. Look for affiliate/partner program link
3. Sign up and get your ref code
4. Add to `.env`: `REMOTEOK_AFFILIATE_CODE=your-ref-code`

---

### **6. Wellfound (AngelList) Affiliate**
**Payout:** Varies  
**Approval:** Easy

**How to Sign Up:**
1. Visit: https://wellfound.com
2. Contact their partnership team
3. Get your affiliate ID
4. Add to `.env`: `WELLFOUND_AFFILIATE_ID=your-id`

---

## **🔧 Setting Up Environment Variables**

### **1. Open your `.env` file in the `server/` directory**

### **2. Add your affiliate IDs:**

```env
# Affiliate Program IDs (For Monetization)
ZIPRECRUITER_AFFILIATE_ID="zr123456"
INDEED_PUBLISHER_ID="pub987654"
FLEXJOBS_AFFILIATE_ID="flex456789"
LINKEDIN_PARTNER_ID="li-partner-123"
REMOTEOK_AFFILIATE_CODE="remoteok-abc123"
WELLFOUND_AFFILIATE_ID="wf-affiliate-xyz"
```

### **3. Restart your backend server**

```bash
cd server
npm run dev
```

---

## **💵 Expected Revenue**

### **Monthly Revenue Estimates (Conservative)**

| Monthly Visitors | Applications/Clicks | Monthly Revenue |
|------------------|---------------------|-----------------|
| 5,000 | 500 | $500 - $1,500 |
| 10,000 | 1,000 | $1,000 - $3,000 |
| 25,000 | 2,500 | $2,500 - $7,500 |
| 50,000 | 5,000 | $5,000 - $15,000 |
| 100,000 | 10,000 | $10,000 - $30,000 |

**Assumptions:**
- 10% of visitors click "Apply Now"
- Average payout: $1-3 per click

---

## **📊 Tracking Your Revenue**

### **View Affiliate Analytics in Admin Dashboard:**

1. Login as admin
2. Go to: `/admin/dashboard`
3. Look for "Affiliate Revenue" section
4. See:
   - Total clicks
   - Clicks by job source
   - Estimated revenue
   - Click trends over time

### **API Endpoint:**
```
GET /api/admin/affiliate/analytics?timeRange=30d
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalClicks": 1234,
    "clicksBySource": {
      "ZipRecruiter": 450,
      "Indeed": 380,
      "FlexJobs": 120,
      "LinkedIn": 200,
      "Remote.ok": 84
    },
    "estimatedRevenue": 4567.89,
    "timeRange": "30d",
    "clicksOverTime": [...]
  }
}
```

---

## **✅ Quick Start Checklist**

- [ ] Sign up for ZipRecruiter affiliate program
- [ ] Sign up for Indeed publisher program
- [ ] Sign up for FlexJobs affiliate program
- [ ] Add affiliate IDs to `.env` file
- [ ] Restart backend server
- [ ] Test a job click and verify affiliate link works
- [ ] Monitor affiliate dashboard for clicks
- [ ] Wait for first payout! 💰

---

## **🚀 Next Steps**

### **After 1 Week:**
- Check affiliate click analytics
- See which sources generate most revenue
- Apply to more affiliate programs

### **After 1 Month:**
- Review first affiliate payouts
- Optimize job source mix based on revenue
- Consider adding more monetization strategies

---

## **❓ Troubleshooting**

### **"No clicks showing in analytics"**
- Verify affiliate IDs are correct in `.env`
- Check that backend server restarted after adding IDs
- Try clicking a job link yourself (use incognito mode)
- Check browser console for errors

### **"Affiliate links not working"**
- Make sure you have `ZIPRECRUITER_AFFILIATE_ID` and other IDs set
- Verify the affiliate programs approved your account
- Check that you're using the correct ID format from each program

### **"Low revenue despite high traffic"**
- Focus on high-paying sources (ZipRecruiter, FlexJobs)
- Optimize job descriptions to increase click-through rate
- Add more affiliate programs
- Consider featured/sponsored placements

---

## **💡 Pro Tips**

1. **Start with ZipRecruiter and Indeed** - easiest approval, instant setup
2. **Track which sources generate most revenue** - focus your efforts there
3. **Don't worry if revenue starts slow** - it compounds as traffic grows
4. **Apply to ALL affiliate programs** - more programs = more revenue
5. **Be patient** - affiliate payouts usually come 30-60 days after clicks

---

**Need Help?** Check the admin dashboard at `/admin/analytics` for real-time affiliate statistics!

**Your platform is now monetized while staying 100% FREE for job seekers! 🎉**

