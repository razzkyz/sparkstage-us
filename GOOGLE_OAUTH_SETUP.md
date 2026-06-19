# Google OAuth Setup Guide - SparkStage US

**Date:** June 19, 2026  
**Issue:** `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`  
**Solution:** Enable and configure Google OAuth provider in Supabase

## Problem

User sees error when clicking "Continue with Google" button on login page:
```json
{
  "code": 400,
  "error_code": "validation_failed",
  "msg": "Unsupported provider: provider is not enabled"
}
```

**Root Cause:** Google OAuth provider is not enabled in Supabase dashboard.

## Solution: Enable Google OAuth in Supabase

### Step 1: Create Google OAuth Credentials

#### A. Go to Google Cloud Console
1. Open [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Name: `SparkStage US` (or your preferred name)

#### B. Enable Required APIs
1. Go to **APIs & Services** > **Library**
2. Search and enable:
   - **Google+ API** OR
   - **Google Identity Services API**

#### C. Create OAuth 2.0 Credentials
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure **OAuth consent screen** first:
   - **User Type:** External
   - **App name:** SparkStage US
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
   - **Scopes:** Add `email` and `profile`
   - **Test users:** Add your test email addresses
4. Create OAuth client ID:
   - **Application type:** Web application
   - **Name:** SparkStage US Web Client

#### D. Configure Authorized URLs

**Get your Supabase Project Reference first:**
1. Go to Supabase Dashboard > Project Settings > API
2. Copy **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
3. Extract project reference: `xxxxxxxxxxxxx` (before `.supabase.co`)

**Configure OAuth URLs:**
1. **Authorized JavaScript origins:**
   ```
   http://localhost:5173
   http://localhost:3000
   https://your-production-domain.com
   ```
   
2. **Authorized redirect URIs:**
   ```
   https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback
   http://localhost:5173/auth/callback
   https://your-production-domain.com/auth/callback
   ```
   ⚠️ **IMPORTANT:** Replace `xxxxxxxxxxxxx` with your actual Supabase project reference

3. Click **Create**
4. **Save your credentials:**
   - **Client ID:** `xxxxxxx.apps.googleusercontent.com`
   - **Client Secret:** `GOCSPX-xxxxxxxxxxxxxxx`

### Step 2: Configure Supabase

#### A. Enable Google Provider
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: **sparkstage-us**
3. Go to **Authentication** > **Providers**
4. Find **Google** in the list
5. Toggle to **Enable**

#### B. Enter Google Credentials
1. Paste **Client ID** from Google Cloud Console
2. Paste **Client Secret** from Google Cloud Console
3. **Authorized redirect URL** (auto-filled):
   ```
   https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
4. Click **Save**

### Step 3: Verify Configuration

#### A. Check Supabase Settings
- Authentication > Providers > Google = **Enabled** ✅
- Client ID and Secret are filled
- Redirect URL matches Google Cloud Console

#### B. Test Login Flow
1. Open app: `http://localhost:5173/login`
2. Click **"Continue with Google"** button
3. Should redirect to Google OAuth consent screen
4. After authorization, redirects back to `/auth/callback`
5. User logged in successfully

## Current Implementation

### Login Page (`frontend/src/pages/Login.tsx`)
```typescript
const handleGoogleLogin = async () => {
  setError('');
  setLoading(true);
  persistPostAuthRedirect(postAuthRedirect);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    setError(translateAuthError(error.message));
    setLoading(false);
  }
};
```

✅ **Code is correct** - No changes needed in code, only Supabase configuration.

### Auth Callback (`frontend/src/pages/AuthCallback.tsx`)
✅ Already implemented - Handles OAuth redirect and session creation.

## Testing Checklist

After configuration:

- [ ] Google provider enabled in Supabase Dashboard
- [ ] Client ID and Secret saved in Supabase
- [ ] Redirect URLs match between Google Cloud Console and Supabase
- [ ] Click "Continue with Google" on login page
- [ ] Redirected to Google OAuth consent screen
- [ ] After authorization, redirected back to app
- [ ] User logged in successfully
- [ ] User data saved in `auth.users` table
- [ ] User redirected to correct dashboard (admin vs regular user)

## Common Issues

### Issue 1: "redirect_uri_mismatch"
**Cause:** Redirect URI in Google Cloud Console doesn't match Supabase callback URL  
**Fix:** Add exact URL to Authorized redirect URIs:
```
https://xxxxxxxxxxxxx.supabase.co/auth/v1/callback
```

### Issue 2: "Access blocked: This app's request is invalid"
**Cause:** OAuth consent screen not configured  
**Fix:** Complete OAuth consent screen configuration in Google Cloud Console

### Issue 3: "Unsupported provider" (current issue)
**Cause:** Google provider not enabled in Supabase  
**Fix:** Follow Step 2 above to enable provider

### Issue 4: User data not saved
**Cause:** Supabase auth triggers or RLS policies blocking insert  
**Fix:** Check Supabase logs and ensure auth.users table allows inserts

## Environment Variables

No additional environment variables needed. Google OAuth configuration is managed entirely through:
1. **Google Cloud Console** - OAuth credentials
2. **Supabase Dashboard** - Provider settings

## Security Notes

1. **Never commit Client Secret to git**
2. **Use HTTPS in production** (required by Google OAuth)
3. **Restrict redirect URIs** to only your domains
4. **Enable OAuth consent screen verification** for production
5. **Monitor Supabase Auth logs** for suspicious activity

## Production Deployment

Before deploying to production:

1. **Update Authorized URLs in Google Cloud Console:**
   - Add production domain to JavaScript origins
   - Add production callback URL to redirect URIs
   
2. **Verify OAuth Consent Screen:**
   - Complete all required fields
   - Add privacy policy URL
   - Add terms of service URL
   - Submit for verification if needed

3. **Test with real users:**
   - Remove test mode restrictions
   - Test from production domain
   - Verify user data creation

## Related Files

- `frontend/src/pages/Login.tsx` - Login page with Google OAuth button
- `frontend/src/pages/AuthCallback.tsx` - OAuth callback handler
- `frontend/src/contexts/AuthContext.tsx` - Auth state management
- `frontend/src/lib/supabase.ts` - Supabase client configuration

## Status

🔴 **PENDING** - Waiting for Supabase Google OAuth configuration

**Next Steps:**
1. Follow Step 1 to create Google OAuth credentials
2. Follow Step 2 to enable Google provider in Supabase
3. Test login with Google

---

**Note:** Once configured, users can login with Google and their account will be automatically created in `auth.users` table.
