# Complete Guide to Deploy to Vercel

## Prerequisites
- GitHub account with your repository: `https://github.com/okothsta/premium.git`
- Vercel account (free tier is sufficient)
- Your code pushed to GitHub

---

## Step 1: Create Vercel Account

1. Go to [https://vercel.com](https://vercel.com)
2. Click **"Sign Up"** or **"Log In"**
3. Choose **"Continue with GitHub"** (recommended for easier integration)
4. Authorize Vercel to access your GitHub account

---

## Step 2: Import Your Project

1. After logging in, you'll see the Vercel dashboard
2. Click **"Add New..."** button (top right)
3. Select **"Project"**
4. You'll see a list of your GitHub repositories
5. Find and click on **"premium"** repository
6. Click **"Import"**

---

## Step 3: Configure Project Settings

### Basic Configuration:
- **Project Name**: `premium` (or your preferred name)
- **Framework Preset**: Should auto-detect as **Next.js**
- **Root Directory**: Leave as `./` (default)
- **Build Command**: `npm run build` (should be auto-filled)
- **Output Directory**: `.next` (should be auto-filled)
- **Install Command**: `npm install` (should be auto-filled)

### Environment Variables:
Click **"Environment Variables"** section and add any required variables:

**Common variables you might need:**
```
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
FIREBASE_ADMIN_PRIVATE_KEY=your_private_key
FIREBASE_ADMIN_CLIENT_EMAIL=your_client_email
```

**Note**: Add these for all environments (Production, Preview, Development)

---

## Step 4: Deploy

1. Review all settings
2. Click **"Deploy"** button
3. Wait for the build to complete (usually 2-5 minutes)
4. You'll see build logs in real-time

---

## Step 5: Verify Deployment

1. Once deployment completes, you'll see a success message
2. Click on the deployment to view details
3. Your app will be live at: `https://premium-xxxxx.vercel.app`
4. Test your application to ensure everything works

---

## Step 6: Configure Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Enter your custom domain (e.g., `yourdomain.com`)
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificate

---

## Step 7: Automatic Deployments

Vercel automatically deploys:
- **Production**: Every push to `master` branch
- **Preview**: Every push to other branches or pull requests

### To trigger a new deployment:
1. Push changes to GitHub: `git push origin master`
2. Vercel will automatically detect and deploy
3. Check the Vercel dashboard for deployment status

---

## Step 8: Monitor Deployments

1. Go to your project dashboard
2. Click on **"Deployments"** tab
3. View all deployment history
4. Click on any deployment to see:
   - Build logs
   - Runtime logs
   - Performance metrics

---

## Troubleshooting Common Issues

### Build Fails:
1. Check build logs in Vercel dashboard
2. Common issues:
   - Missing environment variables
   - TypeScript errors (like the rating issue we just fixed)
   - Missing dependencies
   - Build command errors

### Fix Build Errors:
1. Fix errors locally first
2. Test build locally: `npm run build`
3. Commit and push: `git add . && git commit -m "fix: description" && git push`
4. Vercel will automatically redeploy

### Environment Variables Not Working:
1. Ensure variables are added for correct environment
2. Restart deployment after adding variables
3. Check variable names match your code (case-sensitive)

### TypeScript Errors:
1. Run type check locally: `npm run build`
2. Fix all TypeScript errors
3. Commit and push changes
4. Vercel will rebuild automatically

---

## Quick Deploy Commands (From Terminal)

If you prefer command line:

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time - will ask questions)
vercel

# Deploy to production
vercel --prod

# Link existing project
vercel link
```

---

## Best Practices

1. **Always test locally first**: `npm run build` before pushing
2. **Use preview deployments**: Test on preview URLs before merging to master
3. **Monitor build logs**: Check for warnings and errors
4. **Set up environment variables**: Don't hardcode secrets
5. **Use branch protection**: Protect master branch on GitHub
6. **Monitor performance**: Use Vercel Analytics (if enabled)

---

## Current Project Status

Your repository: `https://github.com/okothsta/premium.git`
- Latest commit: `2a99037` (includes TypeScript fix)
- Branch: `master`
- Framework: Next.js 15.5.2

**Next Steps:**
1. Ensure all changes are pushed to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

---

## Support Resources

- Vercel Documentation: https://vercel.com/docs
- Vercel Status: https://vercel-status.com
- Vercel Community: https://github.com/vercel/vercel/discussions

