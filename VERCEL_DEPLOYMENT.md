# Vercel Deployment Guide

## Environment Variables Setup

After deploying to Vercel, you need to set these environment variables in your Vercel dashboard:

### Required Environment Variables:

1. **CLICKPESA_API_KEY**
   - Your ClickPesa production API key

2. **HARAKAPAY_API_KEY**
   - Your HarakaPay production API key

3. **WEBHOOK_URL (Internal Use)**
   - Webhooks are automatically routed to `/api/webhook/clickpesa` and `/api/webhook/harakapay`

### How to Set Environment Variables in Vercel:

1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add each variable above
5. Redeploy your application

### Local Development:

The app will work locally without any changes because it uses fallback values when environment variables are not set.

### Deployment Steps:

1. Push your code to GitHub
2. Connect to Vercel
3. Deploy (first deployment will use localhost webhook)
4. Get your Vercel URL
5. Update `WEBHOOK_URL` environment variable
6. Redeploy

## Notes:

- The app uses environment variables with fallbacks, so it works both locally and on Vercel
- No code changes needed after deployment
- Just update the environment variable and redeploy
