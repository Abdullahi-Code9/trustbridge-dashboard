# GitHub OAuth Checklist

## Local development

- Create a GitHub OAuth app.
- Set the callback URL to `http://localhost:3000/api/auth/callback/github`.
- Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env.local`.
- Generate a strong `NEXTAUTH_SECRET`.

## Production

- Use the deployed callback URL.
- Restrict maintainer access with `GITHUB_MAINTAINER_ORG`.
- Rotate credentials if a preview environment leaks secrets.
