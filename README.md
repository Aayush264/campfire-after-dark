# 🔥 CAMPFIRE AFTER DARK

### Every story has an ending. Some endings follow you home.

**Campfire After Dark** is an AI-powered horror storytelling experience that turns generated stories into immersive, chapter-based adventures with narration, visual scenes, atmospheric soundscapes, and unexpected jump scares.

Built with React, Ollama, and Kokoro ONNX.

---

## 👻 Features

- **AI-generated horror stories** — Generate original horror stories with complete narrative arcs.
- **Choose your experience** — Short and long story modes.
- **Multiple endings** — Story outcomes can range from happy to disturbing and terrifying.
- **Chapter-based storytelling** — Experience stories chapter by chapter.
- **AI narration** — Local text-to-speech powered by Kokoro ONNX.
- **Visual storytelling** — Atmospheric scenes and horror imagery.
- **Immersive soundscapes** — Ambient audio and sound effects.
- **Jump scares** — Unexpected visual and audio scares, including sound-only scares.
- **Replay controls** — Replay individual chapters or the complete story.
- **Story library** — Save and revisit your stories.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend application |
| Vite | Development server and build tool |
| JavaScript | Application logic |
| CSS | Interface and visual styling |
| Ollama | Local AI story generation |
| Qwen 3 (4B Instruct) | Story generation model |
| Python | Narration server |
| FastAPI | Local narration API |
| Kokoro ONNX | Text-to-speech narration |

---

## 🚀 Getting Started

### Prerequisites

Install the following before running the project:

- [Node.js](https://nodejs.org/)
- [Python](https://www.python.org/)
- [Git](https://git-scm.com/)
- [Ollama](https://ollama.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Aayush264/campfire-after-dark.git
cd campfire-after-dark
```

### 2. Install frontend dependencies

```bash
npm install
```

### 3. Set up Ollama

Install and launch Ollama, then download the model:

```bash
ollama pull qwen3:4b-instruct
```

Make sure Ollama is running before generating stories.

### 4. Set up the local narrator

Create a Python virtual environment:

```bash
cd voice_server
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\activate
```

Install the required packages:

```bash
pip install fastapi uvicorn kokoro-onnx soundfile
```

Place the compatible Kokoro model files in:

```text
voice_server/
└── models/
    ├── kokoro-v1.0.onnx
    └── voices-v1.0.bin
```

These model files are intentionally excluded from Git because of their size.

Start the narration server:

```bash
uvicorn server:app --host 127.0.0.1 --port 8000
```

The narrator health endpoint is:

```text
http://127.0.0.1:8000/health
```

### 5. Start Campfire

Open another terminal at the project root and run:

```bash
npm run dev
```

Open the local address displayed by Vite in your browser.

---

## 📁 Project Structure

```text
campfire-after-dark/
│
├── public/
│   ├── audio/
│   ├── scenes/
│   └── campfire-favicon.svg
│
├── src/
│   ├── assets/
│   ├── App.jsx
│   ├── App.css
│   ├── VisualStory.css
│   ├── index.css
│   └── main.jsx
│
├── voice_server/
│   └── server.py
│
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

## 🔒 Local AI Processing

Campfire uses locally running AI services:

- Ollama handles story generation.
- Kokoro ONNX handles narration.
- The FastAPI server provides the local text-to-speech endpoint.

The AI model files and local Python environment are not included in this repository. Set them up separately using the instructions above.

---

## 🌙 The Experience

Turn down the lights, put on your headphones, and step into the dark.

**Welcome to CAMPFIRE.**

---

## 👨‍💻 Author

**Aayush264**

[GitHub Profile](https://github.com/Aayush264)

[Project Repository](https://github.com/Aayush264/campfire-after-dark)

---

*Made with 🔥 and a little fear.*