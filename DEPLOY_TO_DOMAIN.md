# Deploy RahaPremium to rahapremium.com

## Prerequisites
- Domain: **rahapremium.com** (already owned)
- GitHub repo: https://github.com/tony1244418/rahapremium.git
- Firebase project: rahacrone

## Option 1: Deploy to Vercel (Recommended - Easiest)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```

### Step 3: Deploy from your project folder
```bash
cd C:\Users\user\Desktop\rahapremium-main
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- What's your project's name? **rahapremium**
- In which directory is your code located? **./** (press Enter)
- Want to override the settings? **No**

### Step 4: Add your domain
```bash
vercel domains add www.rahapremium.com
vercel domains add rahapremium.com
```

Or go to: https://vercel.com/dashboard → Your Project → Settings → Domains

Add:
1. `www.rahapremium.com` (primary)
2. `rahapremium.com` (redirect to www)

### Step 5: Configure Environment Variables

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables (copy from `.env.production`):
```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAF4ppez6gkiZYNwBn-LMh97NeeYkZ6aQY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rahacrone.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rahacrone
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rahacrone.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=197453554994
NEXT_PUBLIC_FIREBASE_APP_ID=1:197453554994:web:8770581f174f90a2e4e32b
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-TJGW944GVX

NEXT_PUBLIC_SITE_URL=https://www.rahapremium.com
NEXT_PUBLIC_CANONICAL_HOST=www.rahapremium.com
NEXT_PUBLIC_APEX_HOST=rahapremium.com

NEXT_PUBLIC_SUPPORT_EMAIL=support@rahapremium.com
NEXT_PUBLIC_SUPPORT_WHATSAPP=+255700000000
NEXT_PUBLIC_EMAIL_DOMAIN=rahapremium.com

CLICKPESA_API_BASE=https://api.clickpesa.com/third-parties
CLICKPESA_CLIENT_ID=(your ClickPesa client ID)
CLICKPESA_API_KEY=(your ClickPesa API key)
CLICKPESA_ORIGIN=https://www.rahapremium.com
CLICKPESA_CALLBACK_URL=https://www.rahapremium.com/api/webhook/clickpesa

PRESSSO_BASE_URL=https://pressopay.com
PRESSSO_API_KEY=pk_UwEZ_-pcXcIsxze1
PRESSSO_API_SECRET=sk_WFF-wnCGuPT-nP07DVQJiTSPaRtdF-zt62CaQXi4GwU

TOKEN_SERVICE_URL=https://aztv-token-service.onrender.com
TOKEN_SERVICE_API_KEY=CxkYKqKqReRGQj65Ie5idhOrgAX6EHor4hP1xti0Ch8
CDN_HOST=https://cdnedgch2.azamtvltd.co.tz
```

### Step 6: Configure DNS (at your domain registrar)

Add these DNS records for **rahapremium.com**:

**For Vercel:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: 3600

Type: A
Name: @
Value: 76.76.21.21
TTL: 3600
```

**Or if Vercel gives you different DNS records, use those instead.**

### Step 7: Update Payment Gateway Webhook URL

Go to your payment gateway dashboard (ClickPesa/PressoPay) and update webhook URL to:
```
https://www.rahapremium.com/api/webhook/clickpesa
https://www.rahapremium.com/api/webhook/pressopay
```

### Step 8: Redeploy
```bash
vercel --prod
```

---

## Option 2: Deploy to Railway

### Step 1: Install Railway CLI
```bash
npm install -g @railway/cli
```

### Step 2: Login
```bash
railway login
```

### Step 3: Initialize and Deploy
```bash
cd C:\Users\user\Desktop\rahapremium-main
railway init
railway up
```

### Step 4: Add Custom Domain
```bash
railway domain
```
Then add: `www.rahapremium.com`

---

## Option 3: Deploy to Your Own Server (VPS)

### Requirements:
- Ubuntu/Debian VPS
- Node.js 18+
- Nginx
- SSL certificate (Let's Encrypt)

### Quick Setup:
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone repo
git clone https://github.com/tony1244418/rahapremium.git
cd rahapremium

# Install dependencies
npm install

# Build
npm run build

# Install PM2
npm install -g pm2

# Start app
pm2 start npm --name "rahapremium" -- start
pm2 save
pm2 startup
```

Configure Nginx as reverse proxy to port 3000.

---

## After Deployment:

1. ✅ Test the site: https://www.rahapremium.com
2. ✅ Test payment flow (should auto-complete now!)
3. ✅ Check webhook logs in deployment dashboard
4. ✅ Test user registration and login

## Troubleshooting:

**Payments still not auto-completing?**
- Check webhook URL in payment gateway dashboard
- Check deployment logs for webhook errors
- Verify environment variables are set correctly

**Site not loading?**
- Check DNS propagation (can take 24-48 hours)
- Use https://dnschecker.org to verify

**Need help?**
Contact: support@rahapremium.com
