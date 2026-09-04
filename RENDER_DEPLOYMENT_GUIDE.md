# Deploy CampusOS to Render

## Quick Start (5 minutes)

### Step 1: Connect to Render
1. Go to https://render.com
2. Sign in with GitHub (or create an account)
3. Click **"New +"** → **"Web Service"**
4. Search for `cse-carnival-hampton` and select it
5. Click **"Connect"**

### Step 2: Configure the Web Service

**Name:** `campusos` (or any name)

**Environment:** Node  
**Build Command:** `npm ci && npm run build`  
**Start Command:** `npm start`  
**Instance Type:** Free (or Starter for production)

### Step 3: Add Environment Variables

Click **"Advanced"** and add these environment variables:

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Required |
| `LLM_PROVIDER` | `groq` | Options: `groq`, `openai`, or `gemini` |
| `GROQ_API_KEY` | `your_key_here` | Get free key from https://console.groq.com/keys |
| `OPENAI_API_KEY` | (optional) | If using OpenAI instead |
| `GOOGLE_API_KEY` | (optional) | If using Google (limited to 20 requests/day) |
| `DATABASE_PATH` | `/tmp/campusos.db` | Render's ephemeral storage (auto-recreated on each deploy) |

**Recommended:** Use Groq (free, unlimited tier is generous enough for demo)

### Step 4: Deploy

Click **"Create Web Service"**

Render will:
1. Clone your repo
2. Install dependencies (`npm ci`)
3. Build the Next.js app (`npm run build`)
4. Start the server
5. Seed the database on first run

**Deployment time:** 3-5 minutes

### Step 5: Test

Once deployed:
1. Click the URL at the top of your Render dashboard
2. You should see CampusOS dashboard
3. Test the agent by typing a question

---

## Important Notes

### Database Persistence
- Render provides **ephemeral storage** at `/tmp/` — the database is recreated on each restart
- The seed script (`scripts/seed.mjs`) runs automatically when the database doesn't exist
- **This is by design** — it ensures judges always get a fresh, clean database
- If you need persistent data across restarts, upgrade to a Render PostgreSQL database (optional upgrade)

### Native Build
- `better-sqlite3` requires Node.js native build tools
- **Render Standard has these built-in** — no issues expected
- Free tier includes everything needed

### Free Tier Limitations
- Spins down after 15 minutes of inactivity (first request will take ~30 seconds to wake up)
- 0.5 GB RAM
- Suitable for demo and judging (one-time requests)
- For production, upgrade to Starter tier ($7/month)

---

## Deployment Status Dashboard

After clicking "Create Web Service", you'll see a dashboard showing:

- **Status:** Building → Deploying → Live
- **Logs:** Real-time build and server logs
- **URL:** Your live app (e.g., `https://campusos.onrender.com`)

---

## If Build Fails

**Common issues and fixes:**

### 1. "Could not find any Visual Studio installation"
This is for local builds only, not Render. Render has the build tools. If it happens:
- Click **"Manual Deploy"** → **"Deploy latest commit"**

### 2. "Module not found: better-sqlite3"
- Native build likely incomplete during installation
- Click **"Restart Instance"** on the Render dashboard
- If still failing, check build logs for the full error

### 3. "LLM API key not found"
- You didn't set an API key in environment variables
- Go back to your service settings
- Add ONE of: `GROQ_API_KEY`, `OPENAI_API_KEY`, or `GOOGLE_API_KEY`
- Redeploy (or just restart the instance)

---

## Verification Checklist

After deployment, verify these work:

- [ ] Dashboard loads at the Render URL
- [ ] All 5 sections visible (Schedule, Assignments, Rooms, Events, Notices)
- [ ] Chat panel on the right accepts input
- [ ] Agent responds to "When is my next class?"
- [ ] Room booking works
- [ ] Changes (edit/delete) appear immediately

---

## Monitoring & Maintenance

### View Logs
- Dashboard → **"Logs"** tab
- Shows all server activity and errors in real time

### Restart Service
- Dashboard → **"Manual"** → **"Restart Instance"**
- Takes ~10 seconds
- Useful if stuck in infinite loop or after code updates

### Update Code
- Push new commits to GitHub
- Render auto-deploys (if "Auto-Deploy" is enabled)
- Takes 3-5 minutes

---

## Next Steps

1. **Add API Key:** Replace placeholder in environment variables
2. **Test Live:** Open the Render URL and run through the 16-step judge test
3. **Optional:** Upgrade to Starter tier for production use ($7/month)
4. **Share Link:** Give judges the Render URL — they just open it and test, no setup needed

---

## The Render URL

Once deployed, your live CampusOS is at:
```
https://campusos.onrender.com
```
(or whatever name you chose)

Share this URL with judges. They can:
- Add an API key themselves (optional) or
- Use your built-in key if you want to fund a few requests
- Test all 16 judge scenarios without installing anything

---

## Estimated Costs

| Tier | Cost | Best For |
|---|---|---|
| Free | $0/month | Development, quick demo (spins down after 15 min inactivity) |
| Starter | $7/month | Production-ready, stays always-on |
| Standard | $12/month | Higher performance |

For judging, **Free or Starter** is fine. Free works great for one-time judge testing.

---

## Still Need Help?

**Common questions:**

**Q: Will the database stay after I restart?**  
A: No. Render's free tier uses ephemeral storage. The seed data reloads automatically. (This is actually good — judges get a clean slate every time.)

**Q: Can I upgrade later?**  
A: Yes. At any time, click on your service and choose a different tier.

**Q: How do I deploy my own changes?**  
A: Push to GitHub. Render auto-deploys if "Auto-Deploy" is on. Or manually click "Deploy" in the Render dashboard.

**Q: What if the native build fails?**  
A: Render has all build tools. If it still fails, check the build logs and look for "better-sqlite3" errors. Most common fix is to restart the instance.

---

## Deployment Complete ✅

Your CampusOS is now live on Render. Share the URL with judges. They can test without any local setup.
