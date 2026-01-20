# Troubleshooting

## Common Issues

### 1. CORS Errors

- **Cause**: Backend not configured to allow requests from the frontend.
- **Solution**: Ensure Flask-CORS is properly set up in `app.py`.

### 2. Authentication Failures

- **Cause**: Incorrect credentials or expired tokens.
- **Solution**: Verify credentials and re-login if necessary.

### 3. Sidebar Links Not Working

- **Cause**: Incorrect route paths.
- **Solution**: Check `Router.tsx` for correct route definitions.
