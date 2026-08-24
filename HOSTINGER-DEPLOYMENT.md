# 🚀 Hostinger Deployment Guide for RahaPremium

## ✅ Current Status
- ✅ Localhost working perfectly at http://localhost:3000
- ✅ All code pushed to GitHub
- ✅ Live TV with direct links configured
- 🎯 Ready to deploy to **www.rahapremium.com**

---

## 📋 Pre-Deployment Checklist

### 1. Build Production Files
```powershell
# Navigate to your project
cd C:\Users\user\Desktop\rahapremium-main

# Build for production
npm run build
```

**Expected Output:** Should complete without errors and create a `.next` folder

---

## 🌐 Hostinger Deployment Steps

### Method 1: Node.js Hosting (Recommended)

#### Step 1: Prepare Your Files
1. Build your project locally:
   ```powershell
   npm run build
   ```

2. Create a deployment package with these folders/files:
   - `.next/` (production build)
   - `public/`
   - `node_modules/` (or install on server)
   - `package.json`
   - `next.config.js`
   - `.env.production` (create from .env.local)

#### Step 2: Hostinger Control Panel Setup

1. **Login to Hostinger hPanel**
   - Go to: https://hpanel.hostinger.com

2. **Enable Node.js**
   - Go to **Advanced** → **Node.js**
   - Click **Create Application**
   - Select Node.js version: **18.x or 20.x**
   - Application root: `/public_html` or `/domains/rahapremium.com/public_html`
   - Application startup file: `node_modules/next/dist/bin/next`
   - Application startup command: `start`

3. **Upload Files via FTP/File Manager**
   - Use **File Manager** in hPanel or FTP client (FileZilla)
   - Upload all files to your domain folder

4. **Install Dependencies on Server**
   - Go to **SSH Access** in hPanel
   - Enable SSH and connect
   - Run:
     ```bash
     cd /home/username/domains/rahapremium.com/public_html
     npm install --production
     ```

5. **Set Environment Variables**
   - In hPanel, go to your Node.js application
   - Add environment variables from your `.env.local`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXTAUTH_SECRET`
     - `NEXTAUTH_URL=https://www.rahapremium.com`
     - `PRESSOPAY_SECRET_KEY`
     - `PRESSOPAY_APP_ID`
     - `NODE_ENV=production`

6. **Start Application**
   - Click **Start Application** or **Restart Application**

---

### Method 2: Static Export (Alternative - If Node.js not available)

#### Step 1: Modify next.config.js
Add this line to enable static export:
```javascript
output: 'export',
```

#### Step 2: Build Static Files
```powershell
npm run build
```
This creates an `out` folder with static HTML files.

#### Step 3: Upload to Hostinger
1. Upload contents of `out` folder to `/public_html`
2. Upload `.htaccess` file for routing

**Note:** This method has limitations - no server-side features, no API routes.

---

## 🔧 Configuration Files for Hostinger

### Create `.htaccess` file in public_html
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Redirect apex to www
RewriteCond %{HTTP_HOST} ^rahapremium\.com$ [NC]
RewriteRule ^(.*)$ https://www.rahapremium.com/$1 [R=301,L]

# Handle Next.js routing for static export
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
ExpiresActive On
ExpiresByType image/jpg "access plus 1 year"
ExpiresByType image/jpeg "access plus 1 year"
ExpiresByType image/gif "access plus 1 year"
ExpiresByType image/png "access plus 1 year"
ExpiresByType image/webp "access plus 1 year"
ExpiresByType text/css "access plus 1 month"
ExpiresByType application/javascript "access plus 1 month"
</IfModule>
```

### Create `.env.production`
```env
# Production Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=https://www.rahapremium.com

# PressoPay Configuration
PRESSOPAY_SECRET_KEY=your_pressopay_secret_here
PRESSOPAY_APP_ID=your_pressopay_app_id_here

# Environment
NODE_ENV=production
```

---

## 🔐 Security Checklist

- [ ] All environment variables set on server
- [ ] HTTPS enabled (SSL certificate)
- [ ] Apex domain redirects to www
- [ ] API keys secured (not in client code)
- [ ] Database RLS (Row Level Security) enabled in Supabase

---

## 🎯 Domain Configuration

### Point Domain to Hostinger

1. **If domain registered with Hostinger:**
   - Already configured automatically

2. **If domain registered elsewhere:**
   - Update nameservers to Hostinger's:
     - `ns1.dns-parking.com`
     - `ns2.dns-parking.com`
   - Or add A record pointing to your Hostinger IP

3. **SSL Certificate:**
   - Enable free SSL in Hostinger hPanel
   - Go to **SSL** → Select your domain → Enable SSL

---

## 🧪 Testing After Deployment

### Test These Features:
1. ✅ Homepage loads at https://www.rahapremium.com
2. ✅ User login/registration works
3. ✅ Live TV channels play (direct links)
4. ✅ Movies/Series pages load
5. ✅ Payment integration works
6. ✅ QR code connection works
7. ✅ Admin panel accessible

### Check Console Logs:
```javascript
// Open browser DevTools (F12)
// Check for errors in Console tab
// Network tab should show successful API calls
```

---

## 🐛 Troubleshooting

### Issue: "Application Error" or "500 Error"
**Solution:**
- Check Node.js application logs in hPanel
- Verify all environment variables are set
- Check file permissions (755 for folders, 644 for files)

### Issue: API Routes Not Working
**Solution:**
- Ensure Node.js hosting is enabled (not static hosting)
- Verify `next start` command is used
- Check application startup configuration

### Issue: Live TV Not Playing
**Solution:**
- Check direct stream URLs are accessible
- Verify CORS headers on stream sources
- Test video player libraries loaded correctly

### Issue: Database Connection Failed
**Solution:**
- Verify Supabase URL and keys in production env
- Check Supabase project status
- Ensure RLS policies allow access

### Issue: Payment Webhook Not Working
**Solution:**
- Update PressoPay webhook URL to:
  `https://www.rahapremium.com/api/webhook/pressopay`
- Verify webhook secret matches
- Check API route is accessible

---

## 📊 Performance Optimization

### Enable Caching in .htaccess
Already included in the `.htaccess` above

### Optimize Images
All images should be:
- Compressed (use TinyPNG or similar)
- Proper format (WebP for modern browsers)
- Lazy loaded (already implemented)

### CDN (Optional)
Consider Cloudflare CDN for:
- Faster global delivery
- DDoS protection
- Additional caching

---

## 🔄 Update Deployment Workflow

When you make changes:

1. **Test locally:**
   ```powershell
   npm run dev
   ```

2. **Commit and push to GitHub:**
   ```powershell
   git add .
   git commit -m "Your changes"
   git push
   ```

3. **Rebuild and redeploy:**
   ```powershell
   npm run build
   ```
   Upload changed files to Hostinger

4. **Restart Node.js application** in hPanel

---

## 📞 Support Resources

- **Hostinger Support:** https://www.hostinger.com/tutorials
- **Hostinger Live Chat:** Available in hPanel
- **Node.js Hosting Guide:** https://www.hostinger.com/tutorials/how-to-deploy-nodejs-app

---

## ✅ Quick Deploy Commands

```powershell
# 1. Build production
npm run build

# 2. Test production build locally
npm start

# 3. If everything works, upload to Hostinger via FTP/File Manager
# Files to upload: .next/, public/, package.json, next.config.js, .env.production

# 4. SSH into Hostinger and run:
cd /home/username/domains/rahapremium.com/public_html
npm install --production
pm2 restart all  # or use Hostinger's restart button
```

---

## 🎉 You're Ready!

Your RahaPremium app is ready to deploy to **www.rahapremium.com**!

**Current Status:**
- ✅ Development server working
- ✅ Live TV with direct links configured  
- ✅ Code pushed to GitHub
- 🚀 Ready for production deployment

**Next Step:** Follow the deployment steps above to go live!
