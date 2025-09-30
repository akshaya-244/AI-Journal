# 🚀 Deployment Guide

## Quick Deployment

Run the automated deployment script:
```bash
./deploy.sh
```

## Manual Deployment Steps

### 1. Deploy Backend (Cloudflare Workers)
```bash
cd backend
npm run deploy
```

### 2. Deploy Frontend (Cloudflare Pages)
```bash
cd frontend
npm install
npm run build
npx wrangler pages deploy out --project-name=journal-logs-frontend
```

## Environment Variables Setup

### Frontend (.env.local)
```env
API_BASE_URL=https://journal-logs.akshayamohan-2401.workers.dev
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create/select your project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `https://your-domain.com/api/auth/callback/google`
   - `https://journal-logs-frontend.pages.dev/api/auth/callback/google`

## Domain Configuration

### Option 1: Use Cloudflare Pages Domain
Your app will be available at:
- `https://journal-logs-frontend.pages.dev`

### Option 2: Use Your Custom Domain
1. Add your domain to Cloudflare Pages
2. Update DNS records to point to Cloudflare
3. Update `NEXTAUTH_URL` in environment variables

## Post-Deployment Checklist

- [ ] Backend deployed successfully
- [ ] Frontend deployed successfully
- [ ] Environment variables configured
- [ ] Google OAuth settings updated
- [ ] Domain DNS configured (if using custom domain)
- [ ] SSL certificate active
- [ ] Test login functionality
- [ ] Test journal entry creation
- [ ] Test search functionality

## Troubleshooting

### Build Errors
- Ensure all dependencies are installed: `npm install`
- Check for TypeScript errors: `npm run build`

### Authentication Issues
- Verify Google OAuth credentials
- Check redirect URIs match exactly
- Ensure NEXTAUTH_URL is correct

### API Connection Issues
- Verify API_BASE_URL points to your Workers deployment
- Check CORS settings in backend
- Verify D1 database bindings

## Support
If you encounter issues, check the Cloudflare Workers and Pages documentation.
