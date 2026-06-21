# Project Commands

This project consists of a static HTML/JS frontend and a Supabase backend. The backend does not require a local API server (like Node/Express), as the frontend HTML files communicate directly with your Supabase database using the `supabase-js` client.

## Running the Project

To view and interact with the platform, you simply need to serve the `frontend/` directory using a local static file server.

### Option 1: Using Python (If installed)
Run this command from the root of the project:
```bash
python -m http.server --directory frontend 8000
```
Then open your browser and navigate to: http://localhost:8000

### Option 2: Using Node.js (If installed)
Run this command from the root of the project:
```bash
npx serve frontend
```
It will provide a `localhost` URL (usually http://localhost:3000) that you can open in your browser.

### Option 3: VS Code Live Server Extension
If you are using Visual Studio Code, you can install the **Live Server** extension. Simply right-click on `frontend/index.html` and select **"Open with Live Server"**.

## Backend Setup (Supabase)

The project is already integrated with the provided Supabase URL and Keys inside `frontend/js/supabase-client.js`. If you ever need to set this up from scratch on a new Supabase project:

1. Open your Supabase Dashboard and go to the **SQL Editor**.
2. Copy the entire contents of `backend/sql/schema.sql` and run it to create all tables, functions, and seed data.
3. Go to **Project Settings -> API** to get your Project URL and anon public key.
4. Update the `SUPABASE_URL` and `SUPABASE_ANON_KEY` variables in `frontend/js/supabase-client.js`.
