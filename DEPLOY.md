# Put PARADOX online (free, on Render)

The game runs as one web service: the `Dockerfile` builds the React frontend and serves it from the FastAPI backend at one public address.

1. Upload these files to your GitHub repo, replacing the old ones.
2. Sign in at https://render.com with GitHub. Then click **New → Web Service** and pick this repo.
3. Render finds the `Dockerfile` automatically. Pick a name such as `paradox-space-academy` and the **Free** instance type, then click **Deploy Web Service**.
4. Wait about 5–10 minutes. Your live link is `https://paradox-space-academy.onrender.com`, or whatever name you picked.

Optional settings under **Environment**:
- `OPENAI_API_KEY`: turns on real AI answers. Without it, the offline study guide is used.
- `NASA_API_KEY`: your own NASA key. Without it, `DEMO_KEY` is used.

Notes about the free plan:
- **First visit is slow:** the free service sleeps after 15 minutes without visitors. The first visit then takes about a minute to wake it, so open the link a few minutes before you present.
- **Accounts reset:** accounts and progress are erased whenever the service restarts, which is fine for a demo.
- **Running on Windows:** `paradox.bat` works exactly as before.
