# GitHub Logout Instructions

## ✅ Quick Method: Use the Batch File

**Simply double-click:**
```
github-logout.bat
```

This will automatically remove all GitHub credentials from Windows Credential Manager.

## 🔧 Manual Method

If you prefer to do it manually:

### Step 1: Remove Git Credentials from Windows Credential Manager

1. Press `Windows Key + R`
2. Type: `control /name Microsoft.CredentialManager`
3. Press Enter
4. Click on **Windows Credentials**
5. Look for entries containing:
   - `git:https://github.com`
   - Any entry with "github" in the name
6. Click the **down arrow** next to each entry
7. Click **Remove**

### Step 2: Clear Git Config (Optional)

If you also want to remove your Git user name and email:

```bash
git config --global --unset user.name
git config --global --unset user.email
```

## ✅ Verification

After logging out, verify by running:
```bash
cmdkey /list | findstr git
```

If no Git credentials appear, you're logged out!

## 🔄 Next Time You Use Git

When you push/pull from GitHub next time, you'll be prompted to authenticate again. You can:
- Use a Personal Access Token
- Use GitHub Desktop
- Use SSH keys instead

## 📝 Note

This only removes credentials from your local Windows machine. It doesn't affect:
- Your GitHub account
- Your repositories
- Any SSH keys you have set up








