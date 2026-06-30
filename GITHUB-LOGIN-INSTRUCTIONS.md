# GitHub Login to Another Account

## 🚀 Quick Method: Use the Batch File

**Double-click:**
```
github-login.bat
```

This will guide you through the login process step by step.

## 📋 Manual Steps

### Step 1: Logout from Previous Account

If you haven't already, run:
```
github-logout.bat
```

Or manually remove credentials from Windows Credential Manager.

### Step 2: Set Git User Configuration

```bash
git config --global user.name "YOUR_NEW_USERNAME"
git config --global user.email "YOUR_NEW_EMAIL@example.com"
```

### Step 3: Choose Authentication Method

#### Option A: Personal Access Token (Recommended)

1. **Create a Token:**
   - Go to: https://github.com/settings/tokens
   - Click "Generate new token" → "Generate new token (classic)"
   - Name it (e.g., "My Computer")
   - Select scope: **repo** (full control)
   - Click "Generate token"
   - **COPY THE TOKEN** (you won't see it again!)

2. **Use the Token:**
   - When Git prompts for credentials:
     - Username: Your GitHub username
     - Password: Paste the token (not your GitHub password!)

3. **Windows will save it automatically** in Credential Manager.

#### Option B: GitHub Desktop

1. Download: https://desktop.github.com/
2. Install and sign in with your NEW account
3. GitHub Desktop handles authentication automatically

#### Option C: SSH Keys

1. **Generate SSH Key** (if you don't have one):
   ```bash
   ssh-keygen -t ed25519 -C "your_email@example.com"
   ```

2. **Copy Public Key:**
   ```bash
   type %USERPROFILE%\.ssh\id_ed25519.pub
   ```
   Copy the entire output.

3. **Add to GitHub:**
   - Go to: https://github.com/settings/keys
   - Click "New SSH key"
   - Paste your public key
   - Click "Add SSH key"

4. **Change Remote URL to SSH:**
   ```bash
   git remote set-url origin git@github.com:USERNAME/REPO.git
   ```

## ✅ Verify Your Login

Test your connection:

```bash
# Check Git config
git config --global user.name
git config --global user.email

# Test GitHub connection
git ls-remote https://github.com/YOUR_USERNAME/REPO.git
```

Or try pushing/pulling from a repository.

## 🔍 Check Current Credentials

```bash
cmdkey /list | findstr git
```

## ⚠️ Important Notes

1. **Personal Access Tokens** expire. You may need to create a new one.
2. **SSH Keys** don't expire and are more secure for long-term use.
3. **GitHub Desktop** is easiest if you prefer a GUI.
4. Windows Credential Manager saves your credentials automatically.

## 🆘 Troubleshooting

### "Authentication failed"
- Make sure you logged out of the old account first
- Verify your username and token are correct
- Check if your token has the right permissions (repo scope)

### "Permission denied"
- Your token might have expired
- Check repository permissions
- Verify you're using the correct account

### "Repository not found"
- Make sure the repository exists
- Check if you have access to the repository
- Verify the repository URL is correct

## 📝 Quick Reference

| Method | Best For | Security | Ease |
|--------|----------|----------|------|
| Personal Access Token | Command line users | ⭐⭐⭐ | ⭐⭐⭐ |
| GitHub Desktop | GUI users | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| SSH Keys | Advanced users | ⭐⭐⭐⭐⭐ | ⭐⭐ |








