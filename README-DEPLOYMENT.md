# Medication Timing Optimizer - Deployment Guide

## Overview
This is a Next.js application that helps users optimize medication timing schedules using AI. The application includes drug interaction checking, food interaction guidance, and personalized scheduling.

## Security Features Implemented

### API Security
- **Rate Limiting**: 50 requests per 15 minutes per IP
- **CORS Protection**: Origin validation in production
- **Environment Variables**: Sensitive data stored securely
- **Security Headers**: XSS protection, content type options, frame options

### Data Protection
- **No User Data Storage**: No personal information is persisted
- **Client-Side Processing**: Most logic runs in the browser
- **Secure API Keys**: Environment variables for external services

## Deployment Steps

### 1. Prepare Repository
```bash
# Commit all changes
git add .
git commit -m "Add security features and deployment configuration"
git push origin main
```

### 2. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com)
2. Connect your GitHub repository
3. Import the `frontend` folder as the root directory
4. Configure environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini AI API key

### 3. Environment Variables Setup
In Vercel dashboard, add these environment variables:
```
GEMINI_API_KEY=your_actual_gemini_api_key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

### 4. Domain Configuration (Optional)
- Add custom domain in Vercel settings
- Update CORS origins in API routes
- Configure SSL certificates (handled by Vercel automatically)

## API Endpoints

### Secure Endpoints
- `/api/schedule` - POST: Generate optimized medication schedules
- `/api/lnhpd` - GET: Search Canadian drug database
- `/api/umls-lookup` - GET: UMLS medical terminology lookup
- `/api/test-models` - GET: Test API connectivity

### Rate Limits
- Schedule API: 50 requests per 15 minutes
- Other APIs: 100 requests per 15 minutes
- Limits reset automatically

## Monitoring and Maintenance

### Vercel Analytics
- Built-in analytics for performance monitoring
- Error tracking and logging
- Usage metrics

### Security Monitoring
- Monitor API usage patterns
- Check for unusual activity
- Update rate limits as needed

## Cost Considerations

### Vercel (Free Tier)
- 100GB bandwidth/month
- Unlimited static deployments
- Serverless functions with limits

### External APIs
- Google Gemini AI: Pay-per-use
- Monitor API usage in Google Cloud Console

## Troubleshooting

### Common Issues
1. **API Key Errors**: Verify environment variables in Vercel
2. **CORS Issues**: Update allowed origins in API routes
3. **Rate Limiting**: Check IP-based limits and adjust if needed
4. **Build Failures**: Verify all dependencies and environment variables

### Debug Mode
For development, use:
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

## Security Best Practices

1. **Regular Updates**: Keep dependencies updated
2. **API Key Rotation**: Change API keys periodically
3. **Monitor Usage**: Watch for unusual API usage patterns
4. **Backup Strategy**: Regular repository backups
5. **Access Control**: Limit who can deploy changes

## Legal and Compliance

- **HIPAA**: Not storing PHI, but consult legal team
- **GDPR**: No personal data collection
- **Medical Disclaimer**: Clear user guidance on medical advice limitations

## Support

For deployment issues:
1. Check Vercel deployment logs
2. Verify environment variables
3. Test API endpoints individually
4. Review rate limiting configuration

---

**Important**: This application provides general informational purposes only and should not replace professional medical advice.
