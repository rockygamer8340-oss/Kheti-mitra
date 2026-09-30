# 🌿 Kheti Mitra (खेती मित्र) — Crop Doctor for Farmers

Kheti Mitra is a bilingual (Hindi / English) web app for farmers. A farmer photographs a sick leaf, and the app tells them the likely disease and how to treat it, starting with organic options. Farmers can also chat or talk with an AI farm assistant, get an organic fertilizer guide, and ask agricultural specialists for help online or with a field visit.

**Live app (full version with AI):** https://claude.ai/artifact/8STTUF2tScdZm6yWSVcKSo

---

## Features

### 1. Farmer dashboard
- Greeting with the farmer's name.
- Big "Take photo" and "Upload photo" buttons.
- Season tips that change with the month (Rabi, Kharif, Zaid, winter).
- "My farm" profile: name, main crop, village/district, soil type.
- Recent scans with severity, plus a count of open specialist requests.

### 2. Leaf disease detection
- Take a photo with the phone camera, upload from the gallery, or drag and drop.
- The AI reports the crop, likely disease, confidence (%), and severity (low / medium / high).
- It explains symptoms and causes.
- Treatment is listed in order:
  1. Organic treatment (try first)
  2. Chemical option (only if organic fails), by active ingredient with safety notes
  3. Prevention
- One tap sends the result to the AI assistant or to a specialist.

### 3. AI farm assistant
- Text chat in Hindi or English.
- Voice input through the mic button (Hindi `hi-IN` / English `en-IN`).
- "Read answers aloud" option.
- Quick question chips such as yellow leaves, whitefly, Jeevamrut, PM-Kisan.
- Gives safe, practical advice and points to the local KVK or Kisan Call Centre when unsure.

### 4. Organic advice page
- **Organic fertilizers:** vermicompost, FYM, neem cake, green manure, biofertilizers, oil cakes, with doses.
- **Natural pest control:** neem oil, Trichoderma, Pseudomonas, sticky traps, pheromone traps, crop rotation.
- **Make at home:** step-by-step Jeevamrut, neem seed kernel extract, and compost pit.
- **Plan for my crop:** the AI makes an organic plan based on crop, soil, stage and land size.
- A section on why to cut back on heavy chemical use.

### 5. Agricultural specialists
- Five specialist types: plant disease, insect and pest, soil and nutrition, horticulture, natural farming.
- Choose **Online** (phone or video call) or **Field visit**.
- Attach photos, record a video, or choose files (up to 6).
- Add phone number, preferred time, and village.
- "My requests" list with status.
- One-tap call to Kisan Call Centre **1800-180-1551** (free).

### 6. Hindi / English switch
The EN / हिं button at the top changes every screen, and the AI also replies in the chosen language.

---

## How to run on your computer (with AI)

Requires Node.js 18 or newer (https://nodejs.org). No `npm install` is needed.

### Step 1: Get a free API key
1. Open https://aistudio.google.com/apikey and sign in with your Google account.
2. Click **Create API key** and copy it.

### Step 2: Save the key
Open Command Prompt inside the `kheti-mitra` folder and run (put your key in place of `YOUR_KEY`, no spaces around `=`):

```bash
echo GEMINI_API_KEY=YOUR_KEY> .env
```

This creates a file named `.env`. Never share this file or upload it to GitHub (it is already in `.gitignore`).

### Step 3: Start the app
```bash
npm start
```
Open http://localhost:3000 in Chrome.

The terminal shows which AI is connected. Press **Ctrl + C** to stop.

### Using Claude instead of Gemini
Put this in `.env` instead (paid, from https://console.anthropic.com):
```
ANTHROPIC_API_KEY=YOUR_KEY
```

### Changing the model
Add a line to `.env`, for example:
```
GEMINI_MODEL=gemini-flash-latest
```
The default `gemini-flash-lite-latest` gives more free requests per day; `gemini-flash-latest` is smarter but has a smaller free limit.

### Online version
The live link above also works without any setup.

---

## Put it online (GitHub + Render)

GitHub Pages can't run `server.js`, so the AI would not work there. Use Render instead; it runs the server for free.

1. Upload these files to a new GitHub repository: `index.html`, `server.js`, `package.json`, `README.md`, `.env.example`, `.gitignore`. **Never upload `.env`.**
2. Sign in to https://render.com with GitHub and choose **New + → Web Service**.
3. Pick the `kheti-mitra` repository and fill in:
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: Free
4. Under **Environment Variables** add `GEMINI_API_KEY` with your key (optional: `GEMINI_MODEL` = `gemini-flash-latest`).
5. Click **Create Web Service**. After a few minutes you get a link like `https://kheti-mitra.onrender.com`.

On the free plan the site sleeps after 15 minutes without visitors, so the first visit afterwards takes 30–60 seconds.

---

## हिंदी में जल्दी शुरू करें

1. https://aistudio.google.com/apikey से मुफ़्त API key बनाएँ और कॉपी करें।
2. `kheti-mitra` फ़ोल्डर में cmd खोलें और चलाएँ: `echo GEMINI_API_KEY=आपकी_key> .env`
3. फिर चलाएँ: `npm start`
4. Chrome में `localhost:3000` खोलें।

---

## Project files

| File | What it does |
|---|---|
| `index.html` | The whole app (screens, Hindi/English, camera, chat) |
| `server.js` | Small local server; keeps your API key safe and talks to the AI |
| `.env` | Your secret API key (you create this) |
| `.env.example` | Sample of the `.env` file |
| `package.json` | `npm start` command |

## Design

Dark, cinematic style: a sunrise preloader with a 0–100% counter, an animated wheat field drawn in code (no video files), a rounded "portal" window that tilts with the mouse and expands into the Scan page, giant condensed titles (Anton / Mukta), glass navigation, and a custom cursor on mouse devices.

---

## Tech used

| Part | Technology |
|---|---|
| Page | Single HTML file, plain JavaScript and CSS |
| Font | Mukta (supports Hindi and English) |
| AI | Google Gemini or Claude, through `server.js` (Claude runtime in the online link) |
| Voice input | Web Speech API (SpeechRecognition) |
| Voice output | Web Speech API (speechSynthesis) |
| Camera | HTML file input with `capture="environment"` |
| Saved data | Browser localStorage (profile, scans, requests) |
| Theme | Light and dark mode, mobile-first layout |

---

## Limitations

- **Disease detection uses Claude's vision, not a custom-trained ML model.** For production, train a model (for example on the PlantVillage dataset) and call it through your own API.
- **Free API limits are small.** Free Gemini keys allow a limited number of requests per day. For real users, turn on billing.
- **`server.js` is for local use.** To put it online for many farmers, host it on a service like Render or Railway and add the key there as an environment variable.
- **Specialist requests are saved only on the farmer's device.** A real service needs a backend, a specialist login, and notifications.
- **Voice input depends on the browser.** It works best in Chrome on Android. Where it isn't supported, the farmer can type instead.
- **AI advice is an estimate.** Farmers should confirm with a specialist or their Krishi Vigyan Kendra (KVK) before spending on chemicals.

---

## Helpful contacts

- **Kisan Call Centre:** 1800-180-1551 (free, 6 am to 10 pm)
- **Krishi Vigyan Kendra (KVK):** available in every district for free field visits and soil testing

---

## Future ideas

- Custom trained ML model for disease detection
- Backend with database for specialist requests
- Specialist dashboard to reply to farmers
- Real video calls between farmer and specialist
- Weather alerts and mandi (market) prices
- More languages: Punjabi, Marathi, Tamil, Telugu, Bengali
- Offline mode for low-network areas
