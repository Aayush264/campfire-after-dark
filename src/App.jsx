import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./VisualStory.css";

const horrorStyles = [
  { name: "Paranormal", symbol: "◉", description: "Ghosts & hauntings" },
  { name: "Psychological", symbol: "◒", description: "Fear of the unknown" },
  { name: "Creatures", symbol: "⌁", description: "Things in the dark" },
  { name: "Folk horror", symbol: "✳", description: "Legends & curses" },
  { name: "Survival", symbol: "△", description: "Lost in the wild" },
  { name: "Unexplained", symbol: "?", description: "Reality gone wrong" },
];

const fearLabels = ["Uneasy", "Creepy", "Terrifying", "Nightmare", "No mercy"];
const sceneTypes = ["forest", "cabin", "lake", "road", "entity", "campfire"];
const moods = ["calm", "uneasy", "tense", "reveal"];

const soundFiles = {
  fire: "/audio/fire-crackle.wav",
  wind: "/audio/forest-wind.wav",
  drone: "/audio/ominous-drone.wav",
  pulse: "/audio/heartbeat-pulse.wav",
  water: "/audio/lake-water.wav",
  creaks: "/audio/cabin-creaks.wav",
  impact: "/audio/reveal-impact.wav",
  snap: "/audio/scare-snap.wav",
  woodCreak: "/audio/wood-creak.wav",
  sting: "/audio/scene-sting.wav",
};

const soundMoodDetails = {
  calm: {
    label: "Campfire",
    description: "Warm crackling fire, soft night wind, and almost no ominous drone.",
  },
  uneasy: {
    label: "Uneasy",
    description: "The fire recedes. Wind swells and a low, dissonant drone creeps in.",
  },
  tense: {
    label: "Suspense",
    description: "Stronger gusts, a darker drone, and a slow heartbeat-like pulse build tension.",
  },
  reveal: {
    label: "Reveal",
    description: "The fire nearly dies away as the low drone and pulse come forward.",
  },
};

const scareVoiceAssets = {
  scream: ["/audio/scares/scream-01.mp3", "/audio/scares/scream-02.mp3"],
  cry: ["/audio/scares/cry-01.mp3", "/audio/scares/cry-02.mp3"],
  laugh: ["/audio/scares/laugh-01.mp3", "/audio/scares/laugh-02.mp3"],
  whisper: ["/audio/scares/whisper-01.mp3", "/audio/scares/whisper-02.mp3"],
};

const scareImpactAssets = [
  "/audio/scares/impact-01.mp3",
  "/audio/scares/impact-02.mp3",
  "/audio/scares/impact-03.mp3",
  "/audio/scares/impact-04.mp3",
  "/audio/scares/impact-05.mp3",
];

const scareVisualAssets = [
  { src: "/scenes/scares/creature.jpg", kind: "creature" },
  { src: "/scenes/scares/forest-entity.jpg", kind: "forest" },
  { src: "/scenes/scares/ghost-woman.jpg", kind: "woman" },
  { src: "/scenes/scares/pale-face.jpg", kind: "face" },
  { src: "/scenes/scares/scary-girl.jpg", kind: "girl" },
  { src: "/scenes/scares/shadow-figure.jpg", kind: "shadow" },
];

const allScareVoiceAssets = Object.values(scareVoiceAssets).flat();


// ---------------------------------------------------------
// LOCAL STORY DATABASE
// ---------------------------------------------------------

const STORY_DB_NAME = "campfire-after-dark";
const STORY_DB_VERSION = 1;
const STORY_STORE_NAME = "stories";

let storyDbPromise;

function openStoryDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(
      new Error("This browser does not support local story storage.")
    );
  }

  if (storyDbPromise) return storyDbPromise;

  storyDbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(STORY_DB_NAME, STORY_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORY_STORE_NAME)) {
        db.createObjectStore(STORY_STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);

    request.onerror = () => {
      storyDbPromise = null;
      reject(request.error || new Error("Could not open the story library."));
    };

    request.onblocked = () => {
      reject(
        new Error(
          "The story library is busy in another tab. Close other Campfire tabs and retry."
        )
      );
    };
  });

  return storyDbPromise;
}

async function saveStoryRecord(record) {
  const db = await openStoryDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORY_STORE_NAME, "readwrite");

    tx.objectStore(STORY_STORE_NAME).put(record);

    tx.oncomplete = () => resolve(true);

    tx.onerror = () => {
      reject(tx.error || new Error("Could not save the story."));
    };

    tx.onabort = () => {
      reject(tx.error || new Error("Story save was interrupted."));
    };
  });
}

async function getAllStoryRecords() {
  const db = await openStoryDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORY_STORE_NAME, "readonly");
    const request = tx.objectStore(STORY_STORE_NAME).getAll();

    request.onsuccess = () => {
      const items = Array.isArray(request.result) ? request.result : [];

      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

      resolve(items);
    };

    request.onerror = () => {
      reject(request.error || new Error("Could not load saved stories."));
    };
  });
}

async function getStoryRecord(id) {
  const db = await openStoryDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORY_STORE_NAME, "readonly");
    const request = tx.objectStore(STORY_STORE_NAME).get(id);

    request.onsuccess = () => resolve(request.result || null);

    request.onerror = () => {
      reject(request.error || new Error("Could not open this saved story."));
    };
  });
}

async function deleteStoryRecord(id) {
  const db = await openStoryDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORY_STORE_NAME, "readwrite");

    tx.objectStore(STORY_STORE_NAME).delete(id);

    tx.oncomplete = () => resolve(true);

    tx.onerror = () => {
      reject(tx.error || new Error("Could not delete the story."));
    };
  });
}

function makeStoryId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `story-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function estimateRemainingSeconds(elapsedSeconds, progress) {
  const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
  const completed = Math.max(0, Math.min(99, Number(progress) || 0));

  // Wait for enough progress before showing an estimate; early estimates
  // fluctuate too much to be useful.
  if (elapsed < 8 || completed < 8) return null;

  return (elapsed / completed) * (100 - completed);
}

function formatTimeRemaining(seconds) {
  const safe = Math.max(5, Math.ceil((Number(seconds) || 0) / 5) * 5);

  if (safe < 60) {
    return `~${safe} sec left`;
  }

  const rounded = Math.ceil(safe / 15) * 15;
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;

  return remainder === 0
    ? `~${minutes} min left`
    : `~${minutes} min ${remainder} sec left`;
}

function formatStoryDate(timestamp) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(timestamp));
  } catch {
    return "Previously saved";
  }
}


// ---------------------------------------------------------
// ENDING VARIATIONS BY FEAR LEVEL
// ---------------------------------------------------------

const endingOptionsByFear = {
  1: [
    {
      id: "hopeful_escape",
      name: "Hopeful escape",
      weight: 60,
      instruction:
        "The group survives. They escape the danger, the central mystery is explained, and the immediate threat is ended. Finish with relief and a small eerie detail.",
    },
    {
      id: "bittersweet_survival",
      name: "Bittersweet survival",
      weight: 30,
      instruction:
        "The group survives and the main danger is resolved, but they lose something important or carry a lasting emotional consequence.",
    },
    {
      id: "eerie_safe_return",
      name: "Eerie safe return",
      weight: 10,
      instruction:
        "Everyone survives and returns to safety. The mystery is resolved, but one final unsettling image remains.",
    },
  ],

  2: [
    {
      id: "hopeful_escape",
      name: "Hopeful escape",
      weight: 35,
      instruction:
        "The group survives and escapes. Resolve the central mystery and provide a satisfying safe return.",
    },
    {
      id: "bittersweet_survival",
      name: "Bittersweet survival",
      weight: 35,
      instruction:
        "The group survives, but the victory costs them something meaningful. Explain the mystery and show the consequences.",
    },
    {
      id: "dark_survival",
      name: "Dark survival",
      weight: 20,
      instruction:
        "The characters survive, but abandon something important. They deal with the immediate threat at a serious cost.",
    },
    {
      id: "tragic_loss",
      name: "Tragic loss",
      weight: 10,
      instruction:
        "At least one important character dies or is permanently lost. The remaining characters survive and the central threat is conclusively dealt with.",
    },
  ],

  3: [
    {
      id: "bittersweet_survival",
      name: "Bittersweet survival",
      weight: 20,
      instruction:
        "The group survives, but the victory leaves a serious emotional scar. Resolve the central danger.",
    },
    {
      id: "dark_survival",
      name: "Dark survival",
      weight: 20,
      instruction:
        "The group survives with serious consequences. Something precious is permanently lost.",
    },
    {
      id: "tragic_loss",
      name: "Tragic loss",
      weight: 20,
      instruction:
        "One or more important characters die. The remaining survivors face the aftermath, and the central threat reaches a definite conclusion.",
    },
    {
      id: "group_dies",
      name: "Catastrophic ending",
      weight: 15,
      instruction:
        "All main characters die by the end. Make every fate clear without graphic detail. The final paragraphs establish that the group is gone and that the threat has won. Do not use a cliffhanger.",
    },
    {
      id: "trapped_forever",
      name: "Trapped forever",
      weight: 15,
      instruction:
        "The group is permanently trapped by the supernatural threat. Their fate is clear, the central mystery is answered, and the story closes decisively.",
    },
    {
      id: "hopeful_escape",
      name: "Unexpected survival",
      weight: 10,
      instruction:
        "The group survives against the odds, although the experience changes them permanently.",
    },
  ],

  4: [
    {
      id: "dark_survival",
      name: "Dark survival",
      weight: 15,
      instruction:
        "Only a difficult and costly survival is possible. The group faces permanent consequences, but the immediate threat is conclusively handled.",
    },
    {
      id: "tragic_loss",
      name: "Tragic loss",
      weight: 20,
      instruction:
        "Several important characters are lost. Show the fate of survivors and resolve the central danger.",
    },
    {
      id: "group_dies",
      name: "Catastrophic ending",
      weight: 30,
      instruction:
        "Every main character dies by the end. Make the fate of the whole group unmistakable without graphic descriptions. Show the threat's victory and close the story definitively.",
    },
    {
      id: "trapped_forever",
      name: "Trapped forever",
      weight: 20,
      instruction:
        "The group becomes permanently trapped in the entity's world or under its control. Their final fate and the mystery are explicitly resolved.",
    },
    {
      id: "monstrous_transformation",
      name: "Terrifying transformation",
      weight: 15,
      instruction:
        "The group or protagonist is transformed or consumed by the supernatural threat. Reveal the transformation, resolve the immediate conflict and end decisively.",
    },
  ],

  5: [
    {
      id: "dark_survival",
      name: "Almost impossible survival",
      weight: 5,
      instruction:
        "A narrow survival is achieved at an enormous permanent cost. The immediate threat must still be resolved.",
    },
    {
      id: "tragic_loss",
      name: "Terrible sacrifice",
      weight: 10,
      instruction:
        "Most of the group dies or is permanently lost. The fate of survivors and the final outcome of the central threat must be explicit.",
    },
    {
      id: "group_dies",
      name: "Everyone dies",
      weight: 40,
      instruction:
        "All main characters die before the story ends. Establish every fate without graphic detail. There is no hidden survivor or last-minute rescue. The threat wins, and the final paragraph closes the story completely.",
    },
    {
      id: "trapped_forever",
      name: "Eternal nightmare",
      weight: 25,
      instruction:
        "The group is permanently imprisoned, consumed or trapped by the supernatural threat. Reveal their final fate and close the central mystery. No sequel cliffhanger.",
    },
    {
      id: "monstrous_transformation",
      name: "Monstrous transformation",
      weight: 20,
      instruction:
        "The supernatural threat completely changes the fate of the group or protagonist. Give the transformation a decisive ending and resolve the central conflict.",
    },
  ],
};

function chooseEndingPlan(fearLevel) {
  const options = endingOptionsByFear[fearLevel] || endingOptionsByFear[3];

  const total = options.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;

  for (const item of options) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }

  return options[options.length - 1];
}


// ---------------------------------------------------------
// STORY SCARE SCHEDULE
// ---------------------------------------------------------

function getScareSchedule(storyLength) {
  return storyLength === "Short Story"
    ? [
        { index: 2, chapter: 3, mode: "audio", scareAt: "middle" },
        { index: 3, chapter: 4, mode: "visual", scareAt: "late" },
      ]
    : [
        { index: 2, chapter: 3, mode: "audio", scareAt: "middle" },
        { index: 4, chapter: 5, mode: "audio", scareAt: "late" },
        { index: 7, chapter: 8, mode: "visual", scareAt: "late" },
      ];
}


// ---------------------------------------------------------
// SCENE NORMALISATION
// ---------------------------------------------------------

function normaliseScene(value, rawText = "") {
  const source = value && typeof value === "object" ? value : {};

  const scareSound = ["scream", "cry", "laugh", "whisper"].includes(
    String(source.scareSound).toLowerCase()
  )
    ? String(source.scareSound).toLowerCase()
    : "scream";

  return {
    title:
      typeof source.title === "string" && source.title.trim()
        ? source.title.trim().slice(0, 90)
        : "The woods are listening",

    sceneType: sceneTypes.includes(source.sceneType)
      ? source.sceneType
      : "forest",

    mood: moods.includes(source.mood) ? source.mood : "uneasy",

    visualDescription:
      typeof source.visualDescription === "string" &&
      source.visualDescription.trim()
        ? source.visualDescription.trim().slice(0, 500)
        : "An isolated campsite surrounded by dark pines and drifting mist.",

    narration:
      typeof source.narration === "string" && source.narration.trim()
        ? source.narration.trim()
        : rawText.trim() ||
          "The trees are silent. Somewhere in the darkness, a branch snaps.",

    jumpScare:
      source.jumpScare === true ||
      String(source.jumpScare).toLowerCase() === "true",

    entityAppears:
      source.entityAppears === true ||
      String(source.entityAppears).toLowerCase() === "true",

    scareAt: ["early", "middle", "late"].includes(
      String(source.scareAt).toLowerCase()
    )
      ? String(source.scareAt).toLowerCase()
      : "middle",

    scareSound,
    isEnding:
      source.isEnding === true ||
      String(source.isEnding).toLowerCase() === "true",

    soundCue:
      typeof source.soundCue === "string"
        ? source.soundCue.trim().slice(0, 50)
        : "wind",

    scareMode: source.scareMode || "none",
    scareAssets: source.scareAssets || null,
  };
}


// ---------------------------------------------------------
// STORY RESPONSE VALIDATION
// ---------------------------------------------------------

function parseFullStoryResponse(content, requestedCount) {
  const cleaned = String(content || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace <= firstBrace) {
    throw new Error(
      "The storyteller returned an incomplete story. Please try generating it again."
    );
  }

  let parsed;

  try {
    parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  } catch {
    throw new Error(
      "The complete story response was cut off or invalid JSON. Please retry."
    );
  }

  const chapters = Array.isArray(parsed)
    ? parsed
    : parsed.chapters ||
      parsed.scenes ||
      parsed.story?.chapters ||
      parsed.story?.scenes;

  if (!Array.isArray(chapters) || chapters.length < requestedCount) {
    throw new Error(
      `The AI returned only ${
        Array.isArray(chapters) ? chapters.length : 0
      } of ${requestedCount} chapters. The story was incomplete. Please retry.`
    );
  }

  const normalized = chapters
    .filter((item) => item && typeof item === "object")
    .slice(0, requestedCount)
    .map((item) => normaliseScene(item, item.narration || ""));

  if (normalized.length !== requestedCount) {
    throw new Error("The AI did not return all the required chapters.");
  }

  const minimumChapterWords = requestedCount === 5 ? 85 : 100;

  const shortIndex = normalized.findIndex((scene) => {
    const words = String(scene.narration)
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return words < minimumChapterWords;
  });

  if (shortIndex !== -1) {
    throw new Error(
      `Chapter ${shortIndex + 1} was too short. Please retry to generate a complete story.`
    );
  }

  const finalScene = normalized[normalized.length - 1];

  const finalWords = String(finalScene.narration)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (
    finalWords < (requestedCount === 5 ? 95 : 110) ||
    !finalScene.isEnding
  ) {
    throw new Error(
      "The final chapter was too short or was not marked as an ending. Please retry."
    );
  }

  return normalized;
}


// ---------------------------------------------------------
// STREAM THE COMPLETE STORY FROM OLLAMA
// ---------------------------------------------------------

async function askOllamaFullStory(config, totalScenes, onProgress = () => {}) {
  const names = config.names.length
    ? config.names.join(", ")
    : "a close group of friends";

  const isShort = config.duration === "Short Story";
  const minWords = isShort ? 105 : 125;
  const maxWords = isShort ? 135 : 155;

  const endingPlan = config.endingPlan;
  const scareSchedule = config.scareSchedule || [];

  const chapterPlan = isShort
    ? [
        "Chapter 1 — BEGINNING: introduce the friends, campsite, setting, relationships and central mystery. End with the first unmistakable clue.",
        "Chapter 2 — BUILD: investigate the clue, deepen the atmosphere and establish what the group could lose.",
        "Chapter 3 — MIDDLE / AUDIO SCARE: reveal an important truth and include a sudden sound-based frightening moment, such as crying, laughter, a scream or whisper. Do not show the main entity clearly yet.",
        "Chapter 4 — CLIMAX / VISUAL REVEAL: bring the group face to face with the main threat. A physically visible frightening being MUST appear clearly in the visual description and narration. Show a decisive confrontation or escape attempt.",
        "Chapter 5 — RESOLUTION: resolve the central mystery and immediate danger according to the selected ending. Explain what happens to the threat, show the characters' final fate and provide a proper denouement. Do not stop in the middle of the action.",
      ]
    : [
        "Chapter 1 — BEGINNING: introduce the group, campsite, relationships, setting and central mystery.",
        "Chapter 2 — FIRST CLUES: investigate and find concrete evidence. Plant details that matter later.",
        "Chapter 3 — FIRST AUDIO SCARE: introduce a sound-based vocal event. Do not reveal the main entity visually yet.",
        "Chapter 4 — ESCALATION: deepen the mystery, increase the stakes and cause a meaningful setback.",
        "Chapter 5 — MIDPOINT AUDIO SCARE: reveal an important truth and include a second distinct sound-based scare.",
        "Chapter 6 — CONSEQUENCES: the group makes a plan, faces a personal cost and moves toward the source of danger.",
        "Chapter 7 — DESCENT: the plan begins to fail or the threat closes in. Bring the characters to the point of no return.",
        "Chapter 8 — CLIMAX / VISUAL REVEAL: a frightening being MUST be physically visible and clearly described. Stage a decisive confrontation and show the consequence.",
        "Chapter 9 — RESOLUTION: answer the mystery, explain the threat's outcome and each character's fate according to the selected ending. Show the aftermath and finish the story completely.",
      ];

  const scareText = scareSchedule
    .map((item) =>
      item.mode === "visual"
        ? `Chapter ${item.chapter}: mandatory MAIN VISUAL + SOUND scare. A frightening entity must be clearly visible in the scene and narration.`
        : `Chapter ${item.chapter}: sound-only scare. Use an appropriate voice event, but do not show the main entity.`
    )
    .join("\n");

  const prompt =
    `Write the COMPLETE ${
      isShort ? "SHORT STORY" : "LONG STORY"
    } for CAMPFIRE AFTER DARK in one response.\n\n` +
    `Genre: ${config.genre}. Fear level: ${config.fear}/5 (${fearLabels[config.fear - 1]}). Characters: ${names}.\n` +
    `Create exactly ${totalScenes} connected chapters. Write ${minWords}-${maxWords} narration words in EACH chapter.\n\n` +
    `MANDATORY BEGINNING, MIDDLE AND END STRUCTURE:\n${chapterPlan.join("\n")}\n\n` +
    `MANDATORY ENDING DIRECTION: ${endingPlan.name} (${endingPlan.id}). ${endingPlan.instruction}\n\n` +
    `ENDING RULES: resolve the central mystery; give the main threat a clear final outcome; establish the fate of the main characters; show emotional aftermath; no cliffhanger, unexplained final shock or sequel teaser. A tragic ending must still feel complete. Do not skip the climax or resolution.\n\n` +
    `PLANNED SCARES:\n${scareText}\n` +
    `Use scareSound='cry' for sobbing, 'laugh' for unnatural laughter, 'whisper' for a close whisper and 'scream' for a scream. ` +
    `entityAppears=true only when a frightening being is physically visible. A sound, whisper, footprint or knock is not a visible entity.\n\n` +
    `Keep the same characters, locations, clues and cause-and-effect throughout. Do not restart or recap each chapter. Horror must be cinematic, atmospheric, coherent and non-graphic.\n\n` +
    `Return exactly this JSON shape: {"chapters":[{"title":"Chapter title","sceneType":"forest","mood":"uneasy","visualDescription":"Visible shot description","narration":"Complete chapter narration","jumpScare":false,"entityAppears":false,"scareAt":"middle","scareSound":"scream","isEnding":false,"soundCue":"wind"}]}. ` +
    `Every chapter needs all keys. sceneType: forest/cabin/lake/road/entity/campfire. mood: calm/uneasy/tense/reveal. ` +
    `scareAt: early/middle/late. scareSound: scream/cry/laugh/whisper. Boolean keys must be real booleans. isEnding=false except the final chapter, which must be true. Return valid JSON only.`;

  const response = await fetch("/ollama/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen3:4b-instruct",
      format: "json",
      messages: [
        {
          role: "system",
          content:
            "You are a disciplined horror novelist and cinematic storyteller. Write a complete story with a distinct beginning, middle, climax and resolved ending. Follow the selected ending direction, chapter plan, scare placements and JSON schema exactly. Return valid JSON only.",
        },
        { role: "user", content: prompt },
      ],
      stream: true,
      options: {
        temperature: 0.82,
        num_ctx: 8192,
        num_predict: isShort ? 3200 : 5400,
      },
    }),
  });

  if (!response.ok) {
    let message = "Ollama could not generate the complete story.";

    try {
      const data = await response.json();
      message = data.error || message;
    } catch {
      // Keep the default message.
    }

    throw new Error(message);
  }

  let content = "";

  const expectedCharacters =
    totalScenes * (((minWords + maxWords) / 2) * 6 + 260);

  const updateStreamProgress = () => {
    const fraction = Math.min(1, content.length / expectedCharacters);
    onProgress(Math.min(44, 3 + fraction * 41));
  };

  if (response.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";

    while (true) {
      const { value, done } = await reader.read();

      pending += decoder.decode(value || new Uint8Array(), {
        stream: !done,
      });

      const lines = pending.split("\n");
      pending = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;

        let packet;

        try {
          packet = JSON.parse(line);
        } catch {
          continue;
        }

        if (packet.error) throw new Error(packet.error);

        const delta = packet.message?.content || "";

        if (delta) {
          content += delta;
          updateStreamProgress();
        }
      }

      if (done) break;
    }

    if (pending.trim()) {
      try {
        const packet = JSON.parse(pending);

        if (packet.error) throw new Error(packet.error);

        content += packet.message?.content || "";
        updateStreamProgress();
      } catch (error) {
        if (
          error instanceof Error &&
          error.message &&
          !error.message.includes("JSON")
        ) {
          throw error;
        }
      }
    }
  } else {
    const packet = await response.json();
    content = packet.message?.content || "";
    onProgress(44);
  }

  if (!content.trim()) {
    throw new Error("Ollama returned an empty story.");
  }

  onProgress(45);

  return parseFullStoryResponse(content, totalScenes);
}


// ---------------------------------------------------------
// VISUAL SCENE HELPERS
// ---------------------------------------------------------

function inferSceneType(scene) {
  const visualText =
    `${scene.title || ""} ${scene.visualDescription || ""}`.toLowerCase();

  const allText = `${visualText} ${scene.narration || ""}`.toLowerCase();

  if (/\b(cabin|house|room|attic|basement|hallway|porch|doorway|window|bedroom|kitchen|shack)\b/.test(visualText)) {
    return "cabin";
  }

  if (/\b(lake|river|shore|waterline|pond|dock|stream|water)\b/.test(visualText)) {
    return "lake";
  }

  if (/\b(road|highway|bridge|roadside|lane|path|trail|track)\b/.test(visualText)) {
    return "road";
  }

  if (/\b(campfire|campsite|tent|embers|firepit|fire pit|camp site)\b/.test(visualText)) {
    return "campfire";
  }

  if (/\b(forest|woods|pine trees|tree line|woodland|thicket|branches)\b/.test(visualText)) {
    return "forest";
  }

  if (
    scene.entityAppears ||
    /\b(ghost|apparition|spirit|creature|monster|entity|figure|silhouette|pale face|shadow figure)\b/.test(allText)
  ) {
    return "entity";
  }

  return scene.sceneType;
}

function ensureVisualChange(scene, history) {
  let nextType = inferSceneType(scene);
  const previous = history[history.length - 1];

  if (previous && nextType === previous.sceneType) {
    const text =
      `${scene.title} ${scene.visualDescription} ${scene.narration}`.toLowerCase();

    const candidates = [];

    if (/\b(lake|river|shore|water|dock|pond)\b/.test(text)) candidates.push("lake");
    if (/\b(cabin|house|room|door|window|attic|basement)\b/.test(text)) candidates.push("cabin");
    if (/\b(road|path|trail|bridge|footprints|roadside)\b/.test(text)) candidates.push("road");
    if (/\b(tent|campfire|embers|campsite|fire)\b/.test(text)) candidates.push("campfire");
    if (scene.entityAppears || /\b(ghost|apparition|creature|figure|silhouette|entity|pale face)\b/.test(text)) candidates.push("entity");
    if (/\b(forest|woods|trees|branches|pine)\b/.test(text)) candidates.push("forest");

    const alternative = candidates.find((type) => type !== previous.sceneType);

    nextType =
      alternative ||
      sceneTypes[(sceneTypes.indexOf(previous.sceneType) + 1) % sceneTypes.length];
  }

  return { ...scene, sceneType: nextType };
}

function isVisibleEntity(scene) {
  if (scene?.entityAppears === true) return true;

  const text =
    `${scene?.title || ""} ${scene?.visualDescription || ""}`.toLowerCase();

  return /\b(ghost|apparition|visible spirit|creature (appears|emerges|stands)|demon (appears|stands|emerges)|entity (appears|stands|emerges)|figure (stands|appears|emerges)|silhouette (stands|appears|emerges)|pale face (appears|stares|emerges)|woman (stands|appears|is standing)|girl (stands|appears|is standing)|long-haired (woman|figure|girl)|unknown figure (stands|appears)|shadow figure)\b/i.test(text);
}

function ensureVisualScareScene(scene) {
  if (isVisibleEntity(scene)) {
    return {
      ...scene,
      entityAppears: true,
      jumpScare: true,
      scareMode: "visual",
    };
  }

  return {
    ...scene,

    narration:
      `${scene.narration.trim()} Then, at the edge of the light, the thing they had been hearing stepped fully into view. A tall, unmistakably human-like figure stood there, its pale face turned directly toward them.`,

    visualDescription:
      `${scene.visualDescription.trim()} A clearly visible tall human-like figure stands fully in view at the edge of the light, its pale face turned toward the group.`,

    sceneType: "entity",
    entityAppears: true,
    jumpScare: true,
    scareMode: "visual",
  };
}


// ---------------------------------------------------------
// SCENE VISUAL COMPONENT
// ---------------------------------------------------------

function SceneVisual({
  story = false,
  genre = "Paranormal",
  scene = null,
  chapter = 0,
  backgroundSrc = null,
}) {
  const sceneType = sceneTypes.includes(scene?.sceneType)
    ? scene.sceneType
    : "forest";

  const mood = moods.includes(scene?.mood) ? scene.mood : "uneasy";

  const description =
    scene?.visualDescription || `${sceneType} horror scene at night`;

  return (
    <div
      className={`forest-scene ${story ? "story-art" : "hero-art"} scene-${sceneType} mood-${mood}`}
    >
      <img
        key={`${sceneType}-${chapter}-${story ? "story" : "hero"}`}
        className="scene-background-image"
        src={backgroundSrc || `/scenes/${sceneType}.svg`}
        alt={description}
        draggable="false"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: 0,
          animation: story ? "scene-image-enter 800ms ease both" : "none",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(180deg, #04060930 0%, transparent 42%, #030405d9 100%)",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          pointerEvents: "none",
          background:
            mood === "reveal"
              ? "radial-gradient(ellipse at center, #8f15151a, #06040470)"
              : mood === "tense"
                ? "linear-gradient(180deg, #07070718, #08030454)"
                : "transparent",
        }}
      />

      <div className="scene-caption">
        <span>
          {story
            ? `SCENE ${String(chapter).padStart(2, "0")} · ${sceneType.toUpperCase()}`
            : "SCENE PREVIEW"}
        </span>

        <strong>
          {story
            ? (scene?.title || "THE WOODS ARE LISTENING").toUpperCase()
            : "EVERY SHADOW HAS A STORY"}
        </strong>

        <small>{genre.toUpperCase()} · AFTER DARK</small>
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 3,
          pointerEvents: "none",
          opacity: 0.045,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.8'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}


// ---------------------------------------------------------
// MAIN APPLICATION
// ---------------------------------------------------------

function App() {
  const [view, setView] = useState("setup");

  const [genre, setGenre] = useState("Paranormal");
  const [fear, setFear] = useState(3);
  const [duration, setDuration] = useState("Short Story");
  const [jumpscares, setJumpscares] = useState(true);
  const [narration, setNarration] = useState(true);

  const [currentScene, setCurrentScene] = useState(null);
  const [storyChapters, setStoryChapters] = useState([]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreparingNarration, setIsPreparingNarration] = useState(false);
  const [readyToPlay, setReadyToPlay] = useState(false);

  const [storyError, setStoryError] = useState("");
  const [chapter, setChapter] = useState(1);
  const [selectedReplayChapter, setSelectedReplayChapter] = useState(0);
  const [storyFinished, setStoryFinished] = useState(false);
  const [targetSceneCount, setTargetSceneCount] = useState(5);

  const [speechStatus, setSpeechStatus] = useState("idle");
  const [voicePreviewing, setVoicePreviewing] = useState(false);

  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("Waiting to start");
  const [generationElapsed, setGenerationElapsed] = useState(0);

  const generationStartedAtRef = useRef(0);

  const [jumpScareActive, setJumpScareActive] = useState(false);
  const [scareVisualAsset, setScareVisualAsset] = useState("");
  const [scareSoundType, setScareSoundType] = useState("scream");
  const [scareVisualVariant, setScareVisualVariant] = useState(0);

  const [soundscapeEnabled, setSoundscapeEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(0.72);
  const [audioMood, setAudioMood] = useState("calm");
  const [audioStatus, setAudioStatus] = useState("off");

  const [storyId, setStoryId] = useState(null);
  const [storySaveStatus, setStorySaveStatus] = useState("");

  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storiesError, setStoriesError] = useState("");

  const audioEngineRef = useRef(null);
  const currentSceneRef = useRef(null);
  const runIdRef = useRef(0);
  const storyConfigRef = useRef(null);

  const nextSceneTimerRef = useRef(null);
  const scareTimerRef = useRef(null);
  const scareHideTimerRef = useRef(null);
  const scareVoiceDelayTimerRef = useRef(null);

  const scareDueAtRef = useRef(0);
  const scareRemainingRef = useRef(0);

  const narrationTokenRef = useRef(0);
  const narrationAudioRef = useRef(null);
  const narrationAudioUrlRef = useRef(null);

  const storyFinishedRef = useRef(false);
  const scareCountRef = useRef(0);
  const targetScaresRef = useRef(2);
  const lastScareTimeRef = useRef(0);
  const lastVisualAssetRef = useRef("");
  const lastScareVariantRef = useRef(-1);

  const playbackModeRef = useRef("story");

  // No-repeat scare asset tracking.
  const usedScareVoiceAssetsRef = useRef(new Set());
  const usedScareImpactAssetsRef = useRef(new Set());
  const usedScareVisualAssetsRef = useRef(new Set());
  const usedSceneCueAssetsRef = useRef(new Set());

  const scareAudioCacheRef = useRef(new Map());
  const activeScareAudioPlayersRef = useRef(new Set());

  // Complete story chapters.
  const storyScenesRef = useRef([]);
  const chapterIndexRef = useRef(0);

  // Kokoro narration buffers and WAV blobs.
  const narrationContextRef = useRef(null);
  const narrationSourceRef = useRef(null);
  const narrationBufferRef = useRef(null);

  const narrationBuffersRef = useRef(new Map());
  const narrationPendingRef = useRef(new Map());
  const narrationAudioBlobsRef = useRef(new Map());

  const narrationStartedAtRef = useRef(0);
  const narrationOffsetRef = useRef(0);

  // Archived story image and audio assets.
  const storyAssetBlobsRef = useRef(new Map());
  const storyAssetUrlsRef = useRef(new Map());


  // ---------------------------------------------------------
  // GENERATION TIMER
  // ---------------------------------------------------------

  useEffect(() => {
    if (!isGenerating && !isPreparingNarration) {
      return undefined;
    }

    const update = () => {
      if (generationStartedAtRef.current) {
        setGenerationElapsed(
          Math.floor((Date.now() - generationStartedAtRef.current) / 1000)
        );
      }
    };

    update();

    const timer = window.setInterval(update, 1000);

    return () => window.clearInterval(timer);
  }, [isGenerating, isPreparingNarration]);

  function updateProgress(value, stage) {
    setGenerationProgress((previous) =>
      Math.max(previous, Math.min(100, value))
    );

    if (stage) setGenerationStage(stage);
  }


  // ---------------------------------------------------------
  // STORY ASSET OBJECT URL MANAGEMENT
  // ---------------------------------------------------------

  function releaseStoryAssetUrls() {
    storyAssetUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    storyAssetUrlsRef.current.clear();
    storyAssetBlobsRef.current.clear();

    scareAudioCacheRef.current.forEach((player) => {
      player.pause();
      player.removeAttribute("src");
      player.load();
    });

    scareAudioCacheRef.current.clear();
    activeScareAudioPlayersRef.current.clear();
  }

  function registerStoryAsset(path, blob) {
    if (!path || !blob) return;

    storyAssetBlobsRef.current.set(path, blob);

    if (!storyAssetUrlsRef.current.has(path)) {
      storyAssetUrlsRef.current.set(path, URL.createObjectURL(blob));
    }
  }

  function getStoryAssetUrl(path) {
    if (!path) return "";
    return storyAssetUrlsRef.current.get(path) || path;
  }


  // ---------------------------------------------------------
  // KOKORO NARRATION SERVICE
  // ---------------------------------------------------------

  async function requestKokoroAudio(text, speed = 0.88) {
    const response = await fetch("/tts/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, speed }),
    });

    if (!response.ok) {
      let detail = "The local narrator could not generate audio.";

      try {
        const data = await response.json();

        if (typeof data.detail === "string" && data.detail.trim()) {
          detail = data.detail.trim();
        }
      } catch {
        // Keep the default error.
      }

      throw new Error(
        `${detail} Check that the Kokoro server is running on port 8000.`
      );
    }

    return response.blob();
  }

  function getNarrationAudioContext() {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    if (
      !narrationContextRef.current ||
      narrationContextRef.current.state === "closed"
    ) {
      narrationContextRef.current = new AudioContextClass();
    }

    return narrationContextRef.current;
  }

  function unlockNarrationPlayback() {
    try {
      const context = getNarrationAudioContext();
      const resumePromise = context.resume();

      const silent = context.createBuffer(1, 1, context.sampleRate);
      const source = context.createBufferSource();

      source.buffer = silent;
      source.connect(context.destination);
      source.start(0);

      resumePromise?.catch?.((error) =>
        console.warn("Audio unlock pending:", error)
      );
    } catch (error) {
      console.warn("Could not unlock narration audio:", error);
    }
  }

  function releaseNarrationAudio() {
    const audio = narrationAudioRef.current;

    if (audio) {
      audio.onplay = null;
      audio.onended = null;
      audio.onerror = null;

      audio.pause();
      audio.removeAttribute("src");
      audio.load();

      narrationAudioRef.current = null;
    }

    if (narrationAudioUrlRef.current) {
      URL.revokeObjectURL(narrationAudioUrlRef.current);
      narrationAudioUrlRef.current = null;
    }
  }

  function cancelNarration() {
    narrationTokenRef.current += 1;

    const source = narrationSourceRef.current;
    narrationSourceRef.current = null;

    if (source) {
      source.onended = null;

      try {
        source.stop();
      } catch {
        // Already stopped.
      }
    }

    narrationBufferRef.current = null;
    narrationOffsetRef.current = 0;

    releaseNarrationAudio();

    setVoicePreviewing(false);
    setSpeechStatus("idle");
  }

  function previewNarratorVoice() {
    cancelNarration();

    const token = narrationTokenRef.current;

    setVoicePreviewing(true);
    setStoryError("");

    void (async () => {
      try {
        const blob = await requestKokoroAudio(
          "The fire has gone out. Stay very still. Something is standing just beyond the trees. And it knows you are here.",
          0.88
        );

        if (token !== narrationTokenRef.current) return;

        const url = URL.createObjectURL(blob);
        narrationAudioUrlRef.current = url;

        const audio = new Audio(url);
        audio.preload = "auto";
        narrationAudioRef.current = audio;

        audio.onended = () => {
          if (token !== narrationTokenRef.current) return;

          setVoicePreviewing(false);
          releaseNarrationAudio();
        };

        audio.onerror = () => {
          if (token !== narrationTokenRef.current) return;

          narrationTokenRef.current += 1;

          setVoicePreviewing(false);
          releaseNarrationAudio();

          setStoryError("The preview audio could not be played. Try again.");
        };

        await audio.play();
      } catch (error) {
        if (token !== narrationTokenRef.current) return;

        narrationTokenRef.current += 1;

        setVoicePreviewing(false);
        releaseNarrationAudio();

        setStoryError(
          error.message || "Could not generate the local narrator preview."
        );
      }
    })();
  }


  // ---------------------------------------------------------
  // ADAPTIVE SOUNDSCAPE
  // ---------------------------------------------------------

  async function ensureAudioEngine() {
    if (audioEngineRef.current?.ready) {
      return audioEngineRef.current;
    }

    if (audioEngineRef.current?.loading) {
      return audioEngineRef.current.loading;
    }

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
      throw new Error("Web Audio is not supported in this browser.");
    }

    const context = new AudioContextClass();
    const master = context.createGain();

    master.gain.value = 0;
    master.connect(context.destination);

    context.resume().catch(() => {});

    const engine = {
      context,
      master,
      tracks: {},
      buffers: {},
      ready: false,
      loading: null,
    };

    audioEngineRef.current = engine;

    engine.loading = (async () => {
      await Promise.all(
        Object.entries(soundFiles).map(async ([name, url]) => {
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error(`Could not load local audio asset: ${url}`);
          }

          engine.buffers[name] = await context.decodeAudioData(
            await response.arrayBuffer()
          );
        })
      );

      ["fire", "wind", "drone", "pulse", "water", "creaks"].forEach(
        (name) => {
          const source = context.createBufferSource();

          source.buffer = engine.buffers[name];
          source.loop = true;

          const gain = context.createGain();
          gain.gain.value = 0;

          source.connect(gain);
          gain.connect(master);
          source.start();

          engine.tracks[name] = { source, gain };
        }
      );

      engine.ready = true;

      return engine;
    })().catch(async (error) => {
      if (audioEngineRef.current === engine) {
        audioEngineRef.current = null;
      }

      await context.close().catch(() => {});

      throw error;
    });

    return engine.loading;
  }

  function applySoundProfile(
    mood = "uneasy",
    sceneType = "forest",
    engineOverride = null
  ) {
    const engine = engineOverride || audioEngineRef.current;

    setAudioMood(mood);

    if (!engine?.ready) return;

    const profiles = {
      calm: {
        fire: 0.58,
        wind: 0.12,
        drone: 0.025,
        pulse: 0,
        water: 0.02,
        creaks: 0,
      },
      uneasy: {
        fire: 0.27,
        wind: 0.36,
        drone: 0.22,
        pulse: 0.025,
        water: 0.03,
        creaks: 0.04,
      },
      tense: {
        fire: 0.08,
        wind: 0.53,
        drone: 0.37,
        pulse: 0.23,
        water: 0.07,
        creaks: 0.16,
      },
      reveal: {
        fire: 0.015,
        wind: 0.27,
        drone: 0.46,
        pulse: 0.30,
        water: 0.03,
        creaks: 0.10,
      },
    };

    const target = { ...(profiles[mood] || profiles.uneasy) };

    if (sceneType === "campfire") {
      target.fire = Math.min(
        0.78,
        target.fire + (mood === "calm" ? 0.22 : 0.08)
      );
      target.wind *= 0.65;
    } else if (sceneType === "lake") {
      target.water =
        mood === "calm"
          ? 0.48
          : mood === "uneasy"
            ? 0.36
            : mood === "tense"
              ? 0.25
              : 0.12;

      target.wind *= 0.76;
      target.fire *= 0.25;
    } else if (sceneType === "cabin") {
      target.creaks =
        mood === "calm"
          ? 0.035
          : mood === "uneasy"
            ? 0.17
            : mood === "tense"
              ? 0.35
              : 0.22;

      target.wind *= 0.72;
      target.fire *= 0.38;
    } else if (sceneType === "road") {
      target.wind = Math.min(0.68, target.wind + 0.12);
      target.fire *= 0.25;
    } else if (sceneType === "entity") {
      target.drone = Math.min(0.58, target.drone + 0.12);
      target.fire = 0;
      target.pulse = Math.min(0.38, target.pulse + 0.06);
    }

    const now = engine.context.currentTime;

    Object.entries(target).forEach(([name, volume]) => {
      const track = engine.tracks[name];

      if (!track) return;

      track.gain.gain.cancelScheduledValues(now);
      track.gain.gain.setTargetAtTime(volume, now, 0.7);
    });
  }

  async function startSoundscape(moodOverride = null) {
    setSoundscapeEnabled(true);
    setAudioStatus("loading");

    try {
      const engine = await ensureAudioEngine();

      await engine.context.resume();

      applySoundProfile(
        moodOverride || currentScene?.mood || "calm",
        currentScene?.sceneType || "forest",
        engine
      );

      const now = engine.context.currentTime;

      engine.master.gain.cancelScheduledValues(now);
      engine.master.gain.setTargetAtTime(soundVolume, now, 0.18);

      setAudioStatus("playing");

      return engine;
    } catch (error) {
      setSoundscapeEnabled(false);
      setAudioStatus("unavailable");

      setStoryError(
        error.message || "Could not start the local soundscape."
      );

      return null;
    }
  }

  function stopSoundscape() {
    const engine = audioEngineRef.current;

    if (engine) {
      const now = engine.context.currentTime;

      engine.master.gain.cancelScheduledValues(now);
      engine.master.gain.setTargetAtTime(0, now, 0.12);
    }

    setSoundscapeEnabled(false);
    setAudioStatus("off");
  }

  function updateSoundVolume(nextVolume) {
    setSoundVolume(nextVolume);

    const engine = audioEngineRef.current;

    if (engine?.ready && soundscapeEnabled) {
      const now = engine.context.currentTime;

      engine.master.gain.cancelScheduledValues(now);
      engine.master.gain.setTargetAtTime(nextVolume, now, 0.08);
    }
  }

  async function previewSoundMood(mood) {
    if (
      !soundscapeEnabled ||
      audioStatus === "off" ||
      audioStatus === "unavailable"
    ) {
      await startSoundscape(mood);
      return;
    }

    try {
      const engine = await ensureAudioEngine();

      await engine.context.resume();

      applySoundProfile(
        mood,
        currentScene?.sceneType || "forest",
        engine
      );

      setAudioStatus("playing");
    } catch (error) {
      setAudioStatus("unavailable");

      setStoryError(
        error.message || "Could not preview this soundscape."
      );
    }
  }

  function playOneShot(name, volume = 0.8) {
    const engine = audioEngineRef.current;

    if (!engine?.ready || !soundscapeEnabled) return;

    const buffer = engine.buffers[name];

    if (!buffer) return;

    const source = engine.context.createBufferSource();
    const gain = engine.context.createGain();

    source.buffer = buffer;
    gain.gain.value = volume;

    source.connect(gain);
    gain.connect(engine.master);

    source.start();
  }

  function playSceneCue(cueText) {
    const cue = String(cueText || "").toLowerCase();

    if (cue.includes("silence") || cue.includes("none")) return;

    let assetName = null;
    let volume = 0.35;

    if (cue.includes("creak") || cue.includes("wood")) {
      assetName = "woodCreak";
      volume = 0.48;
    } else if (
      cue.includes("metal") ||
      cue.includes("bell") ||
      cue.includes("sting")
    ) {
      assetName = "sting";
      volume = 0.38;
    } else if (
      cue.includes("snap") ||
      cue.includes("impact") ||
      cue.includes("bang")
    ) {
      assetName = "impact";
      volume = 0.34;
    }

    if (!assetName || usedSceneCueAssetsRef.current.has(assetName)) return;

    usedSceneCueAssetsRef.current.add(assetName);
    playOneShot(assetName, volume);
  }


  // ---------------------------------------------------------
  // UNIQUE SCARE ASSET MANAGEMENT
  // ---------------------------------------------------------

  function pickUnusedAsset(pool, usedSet) {
    const available = pool.filter((asset) => !usedSet.has(asset));

    if (!available.length) return null;

    const selected = available[Math.floor(Math.random() * available.length)];

    usedSet.add(selected);

    return selected;
  }

  function inferScareVoiceKind(scene) {
    const text =
      `${scene?.title || ""} ${scene?.visualDescription || ""} ${scene?.narration || ""}`.toLowerCase();

    if (/\b(crying|cries|sob|sobbing|weeping|weep|whimper|whimpering)\b/i.test(text)) {
      return "cry";
    }

    if (/\b(laugh|laughing|laughter|giggle|giggling|chuckle|cackl|snicker)\b/i.test(text)) {
      return "laugh";
    }

    if (/\b(whisper|whispering|murmur|muttering|breathes|breathing close)\b/i.test(text)) {
      return "whisper";
    }

    if (/\b(scream|screaming|shriek|shrieked|howl|yell|shout)\b/i.test(text)) {
      return "scream";
    }

    return ["scream", "cry", "laugh", "whisper"].includes(scene?.scareSound)
      ? scene.scareSound
      : ["scream", "cry", "laugh", "whisper"][
          Math.floor(Math.random() * 4)
        ];
  }

  function chooseScareVoiceAsset(scene) {
    const preferred = inferScareVoiceKind(scene);

    let selected = pickUnusedAsset(
      scareVoiceAssets[preferred] || [],
      usedScareVoiceAssetsRef.current
    );

    if (selected) return { path: selected, kind: preferred };

    const fallbacks = ["scream", "cry", "laugh", "whisper"]
      .filter((kind) => kind !== preferred)
      .sort(() => Math.random() - 0.5);

    for (const kind of fallbacks) {
      selected = pickUnusedAsset(
        scareVoiceAssets[kind],
        usedScareVoiceAssetsRef.current
      );

      if (selected) return { path: selected, kind };
    }

    return null;
  }

  function chooseScareVisual(scene) {
    const text =
      `${scene?.title || ""} ${scene?.visualDescription || ""} ${scene?.narration || ""}`.toLowerCase();

    const available = scareVisualAssets.filter(
      (asset) => !usedScareVisualAssetsRef.current.has(asset.src)
    );

    if (!available.length) return null;

    const preferredKinds = [];

    if (/\b(creature|monster|beast|demon|claws|fangs)\b/i.test(text)) {
      preferredKinds.push("creature", "forest");
    }

    if (/\b(woman|bride|female|long-haired woman)\b/i.test(text)) {
      preferredKinds.push("woman", "girl");
    }

    if (/\b(girl|child|little girl|young girl)\b/i.test(text)) {
      preferredKinds.push("girl", "woman");
    }

    if (/\b(pale face|face|eyes|staring face)\b/i.test(text)) {
      preferredKinds.push("face");
    }

    if (/\b(shadow|silhouette|faceless|dark figure)\b/i.test(text)) {
      preferredKinds.push("shadow", "forest");
    }

    if (/\b(forest|woods|trees|pine)\b/i.test(text)) {
      preferredKinds.push("forest", "creature");
    }

    const preferred = available.filter((asset) =>
      preferredKinds.includes(asset.kind)
    );

    const pool = preferred.length ? preferred : available;

    const selected = pool[Math.floor(Math.random() * pool.length)];

    usedScareVisualAssetsRef.current.add(selected.src);
    lastVisualAssetRef.current = selected.src;

    const variants = [0, 1, 2, 3].filter(
      (variant) => variant !== lastScareVariantRef.current
    );

    lastScareVariantRef.current =
      variants[Math.floor(Math.random() * variants.length)];

    return selected.src;
  }

  function assignScareAssets(scene, mode) {
    const voice = chooseScareVoiceAsset(scene);

    const impactPath = pickUnusedAsset(
      scareImpactAssets,
      usedScareImpactAssetsRef.current
    );

    const visualPath =
      mode === "visual" ? chooseScareVisual(scene) : null;

    return {
      ...scene,
      scareMode: mode,
      jumpScare: true,
      scareSound: voice?.kind || scene.scareSound || "scream",
      scareAssets: {
        voicePath: voice?.path || null,
        voiceKind: voice?.kind || scene.scareSound || "scream",
        impactPath,
        visualPath,
      },
    };
  }

  async function prepareStoryAssetBlobs(chapters, runId) {
    const paths = new Set();

    chapters.forEach((scene) => {
      paths.add(`/scenes/${scene.sceneType}.svg`);

      const assets = scene.scareAssets;

      if (assets?.voicePath) paths.add(assets.voicePath);
      if (assets?.impactPath) paths.add(assets.impactPath);
      if (assets?.visualPath) paths.add(assets.visualPath);
    });

    const list = [...paths];

    let completed = 0;

    for (const path of list) {
      if (runId !== runIdRef.current) return false;

      try {
        const response = await fetch(path);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        registerStoryAsset(path, await response.blob());
      } catch (error) {
        console.warn(`Could not archive story asset ${path}:`, error);
      }

      completed += 1;

      updateProgress(
        92 + (completed / Math.max(1, list.length)) * 5,
        "Saving story visuals and scare resources"
      );
    }

    return true;
  }

  function playScareAssetAudio(path, volume = 0.95) {
    if (!path) return;

    let player = scareAudioCacheRef.current.get(path);

    const source = getStoryAssetUrl(path);

    if (!player) {
      player = new Audio(source);
      player.preload = "auto";
      scareAudioCacheRef.current.set(path, player);
    } else if (
      player.src !== new URL(source, window.location.href).href
    ) {
      player.src = source;
      player.load();
    }

    const cleanup = () => {
      activeScareAudioPlayersRef.current.delete(player);
      player.onended = null;
      player.onerror = null;
    };

    player.onended = cleanup;

    player.onerror = () => {
      cleanup();
      console.warn(`Could not play scare audio: ${path}`);
    };

    player.volume = Math.min(
      1,
      Math.max(0, volume * Math.max(0.5, soundVolume))
    );

    try {
      player.currentTime = 0;
    } catch {
      // Metadata is still loading.
    }

    activeScareAudioPlayersRef.current.add(player);

    const result = player.play();

    result?.catch?.((error) => {
      cleanup();
      console.warn(`Scare audio playback failed: ${path}`, error);
    });
  }

  function stopActiveScareAudio() {
    if (scareVoiceDelayTimerRef.current) {
      window.clearTimeout(scareVoiceDelayTimerRef.current);
      scareVoiceDelayTimerRef.current = null;
    }

    activeScareAudioPlayersRef.current.forEach((player) => {
      player.onended = null;
      player.onerror = null;
      player.pause();

      try {
        player.currentTime = 0;
      } catch {
        // Ignore.
      }
    });

    activeScareAudioPlayersRef.current.clear();
  }

  function playJumpScareSound(scene) {
    const assets = scene?.scareAssets || {};

    if (assets.impactPath) {
      playScareAssetAudio(assets.impactPath, 0.95);
    }

    if (scareVoiceDelayTimerRef.current) {
      window.clearTimeout(scareVoiceDelayTimerRef.current);
    }

    if (assets.voicePath) {
      scareVoiceDelayTimerRef.current = window.setTimeout(() => {
        scareVoiceDelayTimerRef.current = null;
        playScareAssetAudio(assets.voicePath, 0.98);
      }, 140);
    }

    return assets.voiceKind || scene?.scareSound || "scream";
  }

  async function testRevealSound() {
    const engine = await startSoundscape("reveal");

    if (!engine) return;

    applySoundProfile(
      "reveal",
      currentScene?.sceneType || "entity",
      engine
    );

    // The test button previews ambience only.
    // It does not consume or repeat the story's scare assets.
    playOneShot("impact", 0.7);
  }


  // ---------------------------------------------------------
  // GENERATE AND CACHE NARRATION AUDIO
  // ---------------------------------------------------------

  async function prepareNarrationBuffer(index, runId) {
    if (runId !== runIdRef.current) return null;

    if (narrationBuffersRef.current.has(index)) {
      return narrationBuffersRef.current.get(index);
    }

    if (narrationPendingRef.current.has(index)) {
      return narrationPendingRef.current.get(index);
    }

    const scene = storyScenesRef.current[index];

    if (!scene) return null;

    const request = (async () => {
      let blob = narrationAudioBlobsRef.current.get(index);

      if (!blob) {
        const cleanText = String(scene.narration || "")
          .replace(/\*\*(.*?)\*\*/gs, "$1")
          .replace(/__(.*?)__/gs, "$1")
          .replace(/\*(.*?)\*/gs, "$1")
          .replace(/`([^`]+)`/g, "$1")
          .trim();

        const fearLevel = storyConfigRef.current?.fear || 3;

        const speed = Math.max(
          0.76,
          Math.min(0.92, 0.90 - (fearLevel - 1) * 0.025)
        );

        blob = await requestKokoroAudio(cleanText, speed);

        if (runId !== runIdRef.current) return null;

        narrationAudioBlobsRef.current.set(index, blob);
      }

      const context = getNarrationAudioContext();

      const decoded = await context.decodeAudioData(
        await blob.arrayBuffer()
      );

      if (runId !== runIdRef.current) return null;

      narrationBuffersRef.current.set(index, decoded);

      return decoded;
    })();

    narrationPendingRef.current.set(index, request);

    try {
      return await request;
    } finally {
      if (narrationPendingRef.current.get(index) === request) {
        narrationPendingRef.current.delete(index);
      }
    }
  }

  async function prepareAllNarrationBuffers(runId) {
    const failedChapters = [];
    const total = storyScenesRef.current.length;

    setIsPreparingNarration(true);
    setGenerationStage("Preparing narration audio");
    setSpeechStatus("loading");

    for (let index = 0; index < total; index += 1) {
      if (runId !== runIdRef.current) {
        return { cancelled: true, failedChapters };
      }

      try {
        await prepareNarrationBuffer(index, runId);
      } catch (firstError) {
        // One retry catches transient local server/model errors.
        try {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
          await prepareNarrationBuffer(index, runId);
        } catch (secondError) {
          failedChapters.push(index + 1);

          console.warn(
            `Narration pre-generation failed for chapter ${index + 1}:`,
            secondError || firstError
          );
        }
      }

      if (runId !== runIdRef.current) {
        return { cancelled: true, failedChapters };
      }

      updateProgress(
        45 + ((index + 1) / total) * 45,
        `Preparing narration audio · chapter ${index + 1} of ${total}`
      );
    }

    return { cancelled: false, failedChapters };
  }


  // ---------------------------------------------------------
  // SAVE THE COMPLETE STORY
  // ---------------------------------------------------------

  async function persistCurrentStory(idOverride = storyId) {
    const config = storyConfigRef.current;

    if (!config || !storyScenesRef.current.length || !idOverride) {
      return false;
    }

    const chapters = storyScenesRef.current.map((scene, index) => ({
      ...scene,
      narrationAudioBlob: narrationAudioBlobsRef.current.get(index) || null,
      backgroundPath: `/scenes/${scene.sceneType}.svg`,
    }));

    const assetBlobs = [...storyAssetBlobsRef.current.entries()].map(
      ([path, blob]) => ({ path, blob })
    );

    const record = {
      id: idOverride,
      createdAt: config.createdAt || Date.now(),
      updatedAt: Date.now(),
      title: storyScenesRef.current[0]?.title || "Untitled campfire story",
      genre: config.genre,
      characters: config.names || [],
      fear: config.fear,
      duration: config.duration,
      endingPlan: config.endingPlan,
      jumpscares: config.jumpscares,
      narration: config.narration,
      soundscapeEnabled: config.soundscapeEnabled,
      chapters,
      assetBlobs,
    };

    try {
      await saveStoryRecord(record);
      setStorySaveStatus("Saved to your Stories library on this device.");
      return true;
    } catch (error) {
      console.error("Could not save story to IndexedDB:", error);

      setStorySaveStatus(
        "This story is ready, but the local library could not save it. Check your browser storage space or permissions."
      );

      return false;
    }
  }


  // ---------------------------------------------------------
  // NARRATION PLAYBACK
  // ---------------------------------------------------------

  function estimateNarrationMs(text, rate = 0.88) {
    const wordCount = String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    return Math.max(
      9000,
      (wordCount / (145 * Math.max(0.65, rate))) * 60000
    );
  }

  function clearPlaybackTimers() {
    if (nextSceneTimerRef.current) {
      window.clearTimeout(nextSceneTimerRef.current);
    }

    if (scareTimerRef.current) {
      window.clearTimeout(scareTimerRef.current);
    }

    if (scareHideTimerRef.current) {
      window.clearTimeout(scareHideTimerRef.current);
    }

    if (scareVoiceDelayTimerRef.current) {
      window.clearTimeout(scareVoiceDelayTimerRef.current);
    }

    nextSceneTimerRef.current = null;
    scareTimerRef.current = null;
    scareHideTimerRef.current = null;
    scareVoiceDelayTimerRef.current = null;

    scareDueAtRef.current = 0;
    scareRemainingRef.current = 0;
  }

  function finishStory(runId) {
    if (runId !== runIdRef.current) return;

    clearPlaybackTimers();

    storyFinishedRef.current = true;

    setJumpScareActive(false);
    setStoryFinished(true);
    setSpeechStatus("idle");

    if (soundscapeEnabled && audioEngineRef.current?.ready) {
      applySoundProfile("calm", "campfire", audioEngineRef.current);
    }
  }

  async function playNarrationBuffer(
    buffer,
    scene,
    index,
    runId,
    token,
    offset = 0,
    resumed = false
  ) {
    const context = getNarrationAudioContext();

    if (context.state !== "running") {
      await context.resume();
    }

    if (
      token !== narrationTokenRef.current ||
      runId !== runIdRef.current ||
      !buffer
    ) {
      return;
    }

    const source = context.createBufferSource();

    source.buffer = buffer;
    source.connect(context.destination);

    const safeOffset = Math.min(
      Math.max(0, offset),
      Math.max(0, buffer.duration - 0.02)
    );

    narrationSourceRef.current = source;
    narrationBufferRef.current = buffer;
    narrationStartedAtRef.current = context.currentTime;
    narrationOffsetRef.current = safeOffset;

    source.onended = () => {
      if (narrationSourceRef.current !== source) return;

      narrationSourceRef.current = null;
      narrationBufferRef.current = null;
      narrationOffsetRef.current = 0;

      if (
        token !== narrationTokenRef.current ||
        runId !== runIdRef.current
      ) {
        return;
      }

      if (scareTimerRef.current) {
        window.clearTimeout(scareTimerRef.current);
      }

      scareTimerRef.current = null;
      scareRemainingRef.current = 0;
      scareDueAtRef.current = 0;

      setSpeechStatus("idle");

      // A single-chapter replay stops here instead of advancing the story.
      if (playbackModeRef.current === "chapter") return;

      if (index >= storyScenesRef.current.length - 1) {
        finishStory(runId);
      } else {
        advanceToNextChapter(runId, index + 1);
      }
    };

    source.start(0, safeOffset);

    setSpeechStatus("speaking");

    if (!resumed) {
      scareRemainingRef.current = 0;

      scheduleScare(
        scene,
        index + 1,
        runId,
        (buffer.duration - safeOffset) * 1000
      );
    } else if (scareRemainingRef.current > 0) {
      const remaining = scareRemainingRef.current;

      scareDueAtRef.current = Date.now() + remaining;

      scareTimerRef.current = window.setTimeout(() => {
        scareTimerRef.current = null;
        scareRemainingRef.current = 0;

        triggerTimedScare(scene, runId);
      }, remaining);
    }
  }

  async function speakScene(
    scene,
    runId = runIdRef.current,
    sceneIndex = chapterIndexRef.current
  ) {
    if (!scene || runId !== runIdRef.current) return;

    if (!storyConfigRef.current?.narration) {
      setSpeechStatus("idle");
      return;
    }

    if (scareTimerRef.current) {
      window.clearTimeout(scareTimerRef.current);
    }

    scareTimerRef.current = null;
    scareRemainingRef.current = 0;
    scareDueAtRef.current = 0;

    cancelNarration();

    const token = narrationTokenRef.current;

    setStoryError("");
    setSpeechStatus("loading");

    try {
      const buffer = await prepareNarrationBuffer(sceneIndex, runId);

      if (
        !buffer ||
        token !== narrationTokenRef.current ||
        runId !== runIdRef.current
      ) {
        return;
      }

      await playNarrationBuffer(
        buffer,
        scene,
        sceneIndex,
        runId,
        token
      );
    } catch (error) {
      if (
        token !== narrationTokenRef.current ||
        runId !== runIdRef.current
      ) {
        return;
      }

      console.error("Kokoro narration error:", error);

      setSpeechStatus("idle");

      setStoryError(
        error.message ||
          "Local narration failed. Check that the Kokoro voice server is running."
      );
    }
  }

  function advanceToNextChapter(runId, nextIndex) {
    if (
      runId !== runIdRef.current ||
      storyFinishedRef.current
    ) {
      return;
    }

    if (nextIndex >= storyScenesRef.current.length) {
      return finishStory(runId);
    }

    clearPlaybackTimers();

    const scene = storyScenesRef.current[nextIndex];

    chapterIndexRef.current = nextIndex;
    currentSceneRef.current = scene;

    setCurrentScene(scene);
    setChapter(nextIndex + 1);

    if (storyConfigRef.current?.narration) {
      void speakScene(scene, runId, nextIndex);
    } else {
      const delay = estimateNarrationMs(scene.narration, 1);

      scheduleScare(scene, nextIndex + 1, runId, delay);

      nextSceneTimerRef.current = window.setTimeout(
        () => advanceToNextChapter(runId, nextIndex + 1),
        delay
      );
    }
  }

  function playFullStory() {
    if (!readyToPlay || !storyScenesRef.current.length) return;

    unlockNarrationPlayback();
    clearPlaybackTimers();
    stopActiveScareAudio();
    cancelNarration();

    playbackModeRef.current = "story";
    storyFinishedRef.current = false;

    scareCountRef.current = 0;
    lastScareTimeRef.current = 0;

    setStoryFinished(false);
    setJumpScareActive(false);

    const first = storyScenesRef.current[0];

    chapterIndexRef.current = 0;
    currentSceneRef.current = first;

    setCurrentScene(first);
    setChapter(1);

    if (storyConfigRef.current?.narration) {
      void speakScene(first, runIdRef.current, 0);
    } else {
      const delay = estimateNarrationMs(first.narration, 1);

      scheduleScare(first, 1, runIdRef.current, delay);

      nextSceneTimerRef.current = window.setTimeout(
        () => advanceToNextChapter(runIdRef.current, 1),
        delay
      );
    }
  }

  function playSpecificChapter(index) {
    if (!readyToPlay || !storyScenesRef.current[index]) return;

    unlockNarrationPlayback();
    clearPlaybackTimers();
    stopActiveScareAudio();
    cancelNarration();

    playbackModeRef.current = "chapter";
    storyFinishedRef.current = false;

    scareCountRef.current = 0;
    lastScareTimeRef.current = 0;

    setStoryFinished(false);
    setJumpScareActive(false);

    chapterIndexRef.current = index;

    const scene = storyScenesRef.current[index];

    currentSceneRef.current = scene;

    setCurrentScene(scene);
    setChapter(index + 1);

    if (storyConfigRef.current?.narration) {
      void speakScene(scene, runIdRef.current, index);
    } else {
      const delay = estimateNarrationMs(scene.narration, 1);

      scheduleScare(scene, index + 1, runIdRef.current, delay);

      nextSceneTimerRef.current = window.setTimeout(() => {
        setSpeechStatus("idle");
        nextSceneTimerRef.current = null;
      }, delay);
    }
  }

  function toggleNarration() {
    const source = narrationSourceRef.current;
    const context = narrationContextRef.current;
    const buffer = narrationBufferRef.current;

    if (source && context && buffer) {
      const elapsed =
        context.currentTime - narrationStartedAtRef.current;

      narrationOffsetRef.current = Math.min(
        buffer.duration,
        narrationOffsetRef.current + elapsed
      );

      if (scareTimerRef.current) {
        scareRemainingRef.current = Math.max(
          0,
          scareDueAtRef.current - Date.now()
        );

        window.clearTimeout(scareTimerRef.current);
        scareTimerRef.current = null;
      }

      source.onended = null;
      narrationSourceRef.current = null;

      try {
        source.stop();
      } catch {
        // Already stopped.
      }

      setSpeechStatus("paused");
      return;
    }

    if (
      speechStatus === "paused" &&
      buffer &&
      currentSceneRef.current
    ) {
      void playNarrationBuffer(
        buffer,
        currentSceneRef.current,
        chapterIndexRef.current,
        runIdRef.current,
        narrationTokenRef.current,
        narrationOffsetRef.current,
        true
      ).catch((error) => {
        setStoryError(error.message || "Could not resume narration.");
        setSpeechStatus("idle");
      });
    }
  }


  // ---------------------------------------------------------
  // JUMPSCARE TIMING AND PLAYBACK
  // ---------------------------------------------------------

  function scheduleScare(scene, sceneNumber, runId, estimatedMs) {
    if (!scene?.jumpScare || !jumpscares || !scene.scareAssets) return;

    if (Date.now() - lastScareTimeRef.current < 18000) return;

    const fractions = {
      early: 0.30,
      middle: 0.53,
      late: 0.73,
    };

    const base = fractions[scene.scareAt] || 0.53;

    const fraction = Math.min(
      0.84,
      Math.max(0.24, base + (Math.random() - 0.5) * 0.10)
    );

    const delay = Math.max(
      3500,
      Math.min(estimatedMs - 1800, estimatedMs * fraction)
    );

    scareRemainingRef.current = delay;
    scareDueAtRef.current = Date.now() + delay;

    scareTimerRef.current = window.setTimeout(() => {
      scareTimerRef.current = null;
      scareRemainingRef.current = 0;

      triggerTimedScare(scene, runId);
    }, delay);
  }

  function triggerTimedScare(scene, runId) {
    if (
      runId !== runIdRef.current ||
      storyFinishedRef.current ||
      !jumpscares
    ) {
      return;
    }

    if (Date.now() - lastScareTimeRef.current < 18000) return;

    scareCountRef.current += 1;
    lastScareTimeRef.current = Date.now();

    const kind = playJumpScareSound(scene);

    setScareSoundType(kind);

    if (
      scene.scareMode === "visual" &&
      scene.scareAssets?.visualPath
    ) {
      setScareVisualAsset(scene.scareAssets.visualPath);
      setJumpScareActive(true);

      if (scareHideTimerRef.current) {
        window.clearTimeout(scareHideTimerRef.current);
      }

      scareHideTimerRef.current = window.setTimeout(
        () => setJumpScareActive(false),
        1650
      );
    } else {
      setJumpScareActive(false);
    }
  }


  // ---------------------------------------------------------
  // CREATE A NEW STORY
  // ---------------------------------------------------------

  async function startStory() {
    const runId = runIdRef.current + 1;

    runIdRef.current = runId;

    unlockNarrationPlayback();

    clearPlaybackTimers();
    cancelNarration();
    stopActiveScareAudio();
    releaseStoryAssetUrls();

    usedScareVoiceAssetsRef.current.clear();
    usedScareImpactAssetsRef.current.clear();
    usedScareVisualAssetsRef.current.clear();
    usedSceneCueAssetsRef.current.clear();

    storyFinishedRef.current = false;
    playbackModeRef.current = "story";

    scareCountRef.current = 0;
    lastScareTimeRef.current = 0;

    currentSceneRef.current = null;
    storyScenesRef.current = [];
    chapterIndexRef.current = 0;

    narrationBuffersRef.current.clear();
    narrationPendingRef.current.clear();
    narrationAudioBlobsRef.current.clear();

    lastVisualAssetRef.current = "";
    lastScareVariantRef.current = -1;

    const names = [];

    const totalScenes = duration === "Long Story" ? 9 : 5;

    const scareSchedule = jumpscares
      ? getScareSchedule(duration)
      : [];

    targetScaresRef.current = scareSchedule.length;

    setTargetSceneCount(totalScenes);

    const endingPlan = chooseEndingPlan(fear);

    const config = {
      genre,
      fear,
      names,
      duration,
      jumpscares,
      narration,
      soundscapeEnabled,
      endingPlan,
      scareSchedule,
      createdAt: Date.now(),
    };

    storyConfigRef.current = config;

    const newId = makeStoryId();

    setStoryId(newId);
    setStorySaveStatus("");

    setCurrentScene(null);
    setStoryChapters([]);
    setStoryError("");
    setChapter(1);
    setStoryFinished(false);
    setJumpScareActive(false);

    setReadyToPlay(false);
    setIsGenerating(true);
    setIsPreparingNarration(false);

    setGenerationProgress(1);
    setGenerationStage("Writing your complete story");
    setGenerationElapsed(0);

    generationStartedAtRef.current = Date.now();

    setView("story");
    setSpeechStatus("idle");

    if (soundscapeEnabled) {
      void startSoundscape("calm");
    } else if (jumpscares) {
      void ensureAudioEngine().catch(() => {});
    }

    try {
      // Stage 1: generate the complete story in one Ollama request.
      const rawChapters = await askOllamaFullStory(
        config,
        totalScenes,
        (progress) => {
          updateProgress(progress, "Writing your complete story");
        }
      );

      if (runId !== runIdRef.current) return;

      updateProgress(
        45,
        "Complete story generated · preparing narration"
      );

      const prepared = [];

      rawChapters.forEach((rawScene, index) => {
        let scene = ensureVisualChange(rawScene, prepared);

        const scheduled = scareSchedule.find(
          (item) => item.index === index
        );

        if (scheduled?.mode === "visual") {
          scene = ensureVisualScareScene(scene);
          scene.scareAt = scheduled.scareAt;
          scene = assignScareAssets(scene, "visual");
        } else if (scheduled?.mode === "audio") {
          scene = {
            ...scene,
            jumpScare: true,
            scareMode: "audio",
            entityAppears: false,
            scareAt: scheduled.scareAt,
          };

          scene = assignScareAssets(scene, "audio");
        } else {
          scene = {
            ...scene,
            jumpScare: false,
            scareMode: "none",
            scareAssets: null,
          };
        }

        scene.isEnding = index === rawChapters.length - 1;

        prepared.push(scene);
      });

      storyScenesRef.current = prepared;

      setStoryChapters(prepared);
      setSelectedReplayChapter(0);

      const first = prepared[0];

      currentSceneRef.current = first;

      setCurrentScene(first);
      setChapter(1);
      setIsGenerating(false);
      setIsPreparingNarration(true);

      // Stage 2: prepare every narration clip before allowing playback.
      if (config.narration) {
        const prep = await prepareAllNarrationBuffers(runId);

        if (prep.cancelled || runId !== runIdRef.current) {
          return;
        }

        if (prep.failedChapters.length) {
          setStoryError(
            `Narration for chapter${prep.failedChapters.length > 1 ? "s" : ""} ${prep.failedChapters.join(
              ", "
            )} could not be prepared yet. Those clips will be generated if you play them.`
          );
        }
      } else {
        updateProgress(
          90,
          "Story generated · preparing story archive"
        );
      }

      if (runId !== runIdRef.current) return;

      // Stage 3: archive selected audio and visual resources.
      updateProgress(
        92,
        "Saving story visuals and scare resources"
      );

      await prepareStoryAssetBlobs(prepared, runId);

      if (runId !== runIdRef.current) return;

      // Stage 4: store the complete story in IndexedDB.
      updateProgress(
        98,
        "Saving story to your Stories library"
      );

      await persistCurrentStory(newId);

      if (runId !== runIdRef.current) return;

      setIsPreparingNarration(false);
      setGenerationProgress(100);
      setGenerationStage("Ready to play");

      setReadyToPlay(true);
      setSpeechStatus("ready");
      setIsGenerating(false);
      setStoryFinished(false);

      // Playback deliberately waits for the user to press Play.
    } catch (error) {
      if (runId !== runIdRef.current) return;

      console.error("Story preparation failed:", error);

      setStoryError(
        error.message || "Could not prepare the complete story."
      );

      setIsGenerating(false);
      setIsPreparingNarration(false);
      setReadyToPlay(false);
      setSpeechStatus("idle");
      setGenerationStage("Preparation failed");
    }
  }


  // ---------------------------------------------------------
  // STORIES DASHBOARD
  // ---------------------------------------------------------

  async function refreshStories() {
    setStoriesLoading(true);
    setStoriesError("");

    try {
      setStories(await getAllStoryRecords());
    } catch (error) {
      setStoriesError(error.message || "Could not load your saved stories.");
    } finally {
      setStoriesLoading(false);
    }
  }

  async function openStoriesDashboard() {
    runIdRef.current += 1;

    setIsGenerating(false);
    setIsPreparingNarration(false);

    clearPlaybackTimers();
    cancelNarration();
    stopActiveScareAudio();

    setJumpScareActive(false);
    setView("stories");

    await refreshStories();
  }

  async function deleteSavedStory(id) {
    const accepted = window.confirm(
      "Delete this saved story and its locally stored audio? This cannot be undone."
    );

    if (!accepted) return;

    try {
      await deleteStoryRecord(id);
      await refreshStories();
    } catch (error) {
      setStoriesError(error.message || "Could not delete this story.");
    }
  }

  async function openSavedStory(id) {
    const runId = runIdRef.current + 1;

    runIdRef.current = runId;

    clearPlaybackTimers();
    cancelNarration();
    stopActiveScareAudio();
    releaseStoryAssetUrls();

    setStoriesError("");
    setStoryError("");

    setIsGenerating(false);
    setIsPreparingNarration(true);
    setReadyToPlay(false);

    setGenerationProgress(0);
    setGenerationStage("Loading saved story");
    setGenerationElapsed(0);

    generationStartedAtRef.current = Date.now();

    try {
      const record = await getStoryRecord(id);

      if (!record) {
        throw new Error("This saved story could not be found.");
      }

      if (runId !== runIdRef.current) return;

      const chapters = (record.chapters || []).map((item) => {
        const {
          narrationAudioBlob,
          backgroundPath,
          ...scene
        } = item;

        return scene;
      });

      if (!chapters.length) {
        throw new Error("This saved story contains no chapters.");
      }

      storyScenesRef.current = chapters;

      setStoryChapters(chapters);
      setSelectedReplayChapter(0);

      chapterIndexRef.current = 0;
      currentSceneRef.current = chapters[0];

      setCurrentScene(chapters[0]);
      setChapter(1);

      narrationBuffersRef.current.clear();
      narrationPendingRef.current.clear();
      narrationAudioBlobsRef.current.clear();

      record.chapters.forEach((item, index) => {
        if (item.narrationAudioBlob) {
          narrationAudioBlobsRef.current.set(
            index,
            item.narrationAudioBlob
          );
        }
      });

      // Restore the actual selected images and scare audio blobs.
      (record.assetBlobs || []).forEach(({ path, blob }) => {
        if (path && blob) {
          registerStoryAsset(path, blob);
        }
      });

      setGenre(record.genre || "Paranormal");


      setFear(record.fear || 3);
      setDuration(record.duration || "Short Story");
      setJumpscares(Boolean(record.jumpscares));
      setNarration(Boolean(record.narration));
      setSoundscapeEnabled(Boolean(record.soundscapeEnabled));

      setTargetSceneCount(chapters.length);
      setStoryId(record.id);

      setStorySaveStatus(
        "Opened from your local Stories library."
      );

      storyFinishedRef.current = false;
      playbackModeRef.current = "story";

      scareCountRef.current = 0;
      lastScareTimeRef.current = 0;

      usedScareVoiceAssetsRef.current.clear();
      usedScareImpactAssetsRef.current.clear();
      usedScareVisualAssetsRef.current.clear();
      usedSceneCueAssetsRef.current.clear();

      chapters.forEach((scene) => {
        if (scene.scareAssets?.voicePath) {
          usedScareVoiceAssetsRef.current.add(
            scene.scareAssets.voicePath
          );
        }

        if (scene.scareAssets?.impactPath) {
          usedScareImpactAssetsRef.current.add(
            scene.scareAssets.impactPath
          );
        }

        if (scene.scareAssets?.visualPath) {
          usedScareVisualAssetsRef.current.add(
            scene.scareAssets.visualPath
          );
        }
      });

      const config = {
        genre: record.genre || "Paranormal",
        fear: record.fear || 3,
        names: record.characters || [],
        duration: record.duration || "Short Story",
        jumpscares: Boolean(record.jumpscares),
        narration: Boolean(record.narration),
        soundscapeEnabled: Boolean(record.soundscapeEnabled),
        endingPlan: record.endingPlan || {
          name: "Saved ending",
          id: "saved",
        },
        scareSchedule: getScareSchedule(
          record.duration || "Short Story"
        ),
        createdAt: record.createdAt || Date.now(),
      };

      storyConfigRef.current = config;

      targetScaresRef.current = chapters.filter(
        (scene) => scene.jumpScare
      ).length;

      setView("story");
      setStoryFinished(false);
      setJumpScareActive(false);
      setGenerationProgress(45);

      if (config.narration) {
        const prep = await prepareAllNarrationBuffers(runId);

        if (prep.cancelled || runId !== runIdRef.current) {
          return;
        }
      } else {
        updateProgress(90, "Saved story loaded");
      }

      if (runId !== runIdRef.current) return;

      // Refresh the archive if a previously missing narration clip needed regeneration.
      const refreshedChapters = storyScenesRef.current.map(
        (scene, index) => ({
          ...scene,
          narrationAudioBlob:
            narrationAudioBlobsRef.current.get(index) || null,
          backgroundPath: `/scenes/${scene.sceneType}.svg`,
        })
      );

      await saveStoryRecord({
        ...record,
        chapters: refreshedChapters,
        assetBlobs: [
          ...storyAssetBlobsRef.current.entries(),
        ].map(([path, blob]) => ({ path, blob })),
        updatedAt: Date.now(),
      }).catch((error) => {
        console.warn(
          "Could not refresh saved story audio archive:",
          error
        );
      });

      setIsPreparingNarration(false);
      setGenerationProgress(100);
      setGenerationStage("Saved story ready");
      setReadyToPlay(true);
      setSpeechStatus("ready");
    } catch (error) {
      if (runId !== runIdRef.current) return;

      setIsPreparingNarration(false);

      setStoriesError(
        error.message || "Could not open this saved story."
      );

      setStoryError(
        error.message || "Could not open this saved story."
      );
    }
  }


  // ---------------------------------------------------------
  // RETURN TO SETUP
  // ---------------------------------------------------------

  function backToSetup() {
    runIdRef.current += 1;

    clearPlaybackTimers();
    cancelNarration();
    stopActiveScareAudio();
    stopSoundscape();
    releaseStoryAssetUrls();

    storyFinishedRef.current = false;
    currentSceneRef.current = null;
    storyScenesRef.current = [];
    chapterIndexRef.current = 0;

    narrationBuffersRef.current.clear();
    narrationPendingRef.current.clear();
    narrationAudioBlobsRef.current.clear();

    setCurrentScene(null);
    setStoryChapters([]);
    setStoryFinished(false);
    setJumpScareActive(false);
    setIsGenerating(false);
    setIsPreparingNarration(false);
    setReadyToPlay(false);
    setStoryError("");
    setView("setup");
  }


  // ---------------------------------------------------------
  // UPDATE SOUNDS WHEN A NEW CHAPTER APPEARS
  // ---------------------------------------------------------

  useEffect(() => {
    if (!currentScene) return;

    setAudioMood(currentScene.mood || "uneasy");

    if (!soundscapeEnabled) return;

    const engine = audioEngineRef.current;

    if (!engine?.ready) return;

    engine.context.resume().catch(() => {});

    applySoundProfile(
      currentScene.mood,
      currentScene.sceneType,
      engine
    );

    playSceneCue(currentScene.soundCue);
  }, [currentScene, soundscapeEnabled, audioStatus]);


  // ---------------------------------------------------------
  // CLEANUP
  // ---------------------------------------------------------

  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      narrationTokenRef.current += 1;

      clearPlaybackTimers();

      const audio = narrationAudioRef.current;

      if (audio) {
        audio.onplay = null;
        audio.onended = null;
        audio.onerror = null;
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
      }

      if (narrationAudioUrlRef.current) {
        URL.revokeObjectURL(narrationAudioUrlRef.current);
      }

      activeScareAudioPlayersRef.current.forEach((player) => {
        player.onended = null;
        player.onerror = null;
        player.pause();
      });

      storyAssetUrlsRef.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });

      if (
        narrationContextRef.current &&
        narrationContextRef.current.state !== "closed"
      ) {
        narrationContextRef.current.close().catch(() => {});
      }

      if (audioEngineRef.current) {
        audioEngineRef.current.context.close().catch(() => {});
      }
    };
  }, []);


  // ---------------------------------------------------------
  // UI HELPERS
  // ---------------------------------------------------------

  const inPreparation = isGenerating || isPreparingNarration;

  const currentBackground = currentScene
    ? getStoryAssetUrl(`/scenes/${currentScene.sceneType}.svg`)
    : null;

  function openLibraryFromStory() {
    void openStoriesDashboard();
  }

  function renderHeader() {
  return (
    <header className="topbar campfire-topbar">
      <div
        className="brand campfire-brand"
        role="button"
        tabIndex={0}
        aria-label="Go to Campfire home"
        onClick={backToSetup}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            backToSetup();
          }
        }}
      >
        <span className="campfire-logo">
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="campfireFlame" x1="32" y1="18" x2="32" y2="54">
                <stop offset="0%" stopColor="#FFD18B" />
                <stop offset="55%" stopColor="#E9954D" />
                <stop offset="100%" stopColor="#A94F2C" />
              </linearGradient>
              <linearGradient id="campfireCore" x1="32" y1="32" x2="32" y2="50">
                <stop offset="0%" stopColor="#FFF1BF" />
                <stop offset="100%" stopColor="#EFA052" />
              </linearGradient>
            </defs>

            {/* Original spark symbol */}
            <path
              d="M32 4 L34.7 11.8 L42 14.5 L34.7 17.2 L32 25 L29.3 17.2 L22 14.5 L29.3 11.8 Z"
              fill="#FFD18B"
            />

            {/* Campfire flame */}
            <path
              d="M32 20 C29 27 22 31 22 40 C22 48 26 54 33 54 C41 54 46 48 46 41 C46 34 41 28 36 24 C37 31 34 35 31 37 C32 31 30 25 32 20Z"
              fill="url(#campfireFlame)"
              stroke="#F4B36D"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Inner flame */}
            <path
              d="M34 36 C30 40 29 44 32 49 C37 47 39 43 36 39 C35 38 34 37 34 36Z"
              fill="url(#campfireCore)"
            />

            {/* Burning wood */}
            <path
              d="M19 53 L45 53 M23 57 L41 50"
              stroke="#BD7647"
              strokeWidth="3"
              strokeLinecap="round"
            />

            {/* Small sparks */}
            <circle cx="17" cy="29" r="1.4" fill="#EBA76A" />
            <circle cx="48" cy="25" r="1.2" fill="#EBA76A" />
          </svg>
        </span>

        <div className="campfire-brand-copy">
          <div className="campfire-brand-name">CAMPFIRE</div>
          <div className="campfire-brand-subtitle">AFTER DARK</div>
        </div>
      </div>

      <nav className="top-status campfire-nav" aria-label="Main navigation">
        <span className="campfire-status-pill">
          <span className="campfire-status-dot" />
          <span>LOCAL-FIRST DESIGN</span>
        </span>

        <button
          type="button"
          className="campfire-stories-button"
          onClick={openLibraryFromStory}
        >
          <span>☰</span>
          STORIES
        </button>

        <span className="version campfire-version">
          AUTO-NARRATIVE 0.7
        </span>
      </nav>
    </header>
  );
}

  function renderProgressPanel() {
    if (!inPreparation) return null;

    const remainingSeconds = estimateRemainingSeconds(
      generationElapsed,
      generationProgress
    );

    return (
      <div className="visual-direction-card" style={{ marginTop: 18 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>✦ {generationStage.toUpperCase()}</span>

          <strong
            style={{
              color: "#e5b080",
              fontSize: 12,
              whiteSpace: "nowrap",
            }}
          >
            {Math.round(generationProgress)}%
          </strong>
        </div>

        <div
          style={{
            height: 8,
            marginTop: 12,
            borderRadius: 10,
            overflow: "hidden",
            background: "#312a23",
          }}
        >
          <div
            style={{
              width: `${Math.max(
                2,
                Math.min(100, generationProgress)
              )}%`,
              height: "100%",
              borderRadius: 10,
              background:
                "linear-gradient(90deg, #8b4b2d, #e5ab70)",
              transition: "width 350ms ease",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            marginTop: 10,
            color: "#b5aa9a",
            fontSize: 11,
          }}
        >
          <span>
            {isGenerating
              ? "Writing the complete story"
              : "Preparing all chapter narration and saving assets"}
          </span>

          <strong
            style={{
              color: "#e5b080",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {remainingSeconds === null
              ? "Estimating time left…"
              : formatTimeRemaining(remainingSeconds)}
          </strong>
        </div>

      </div>
    );
  }

  function renderSoundscapePanel() {
    return (
      <div className="soundscape-panel">
        <div className="soundscape-top-row">
          <div className="soundscape-heading">
            <span className="soundscape-icon">♫</span>

            <div>
              <strong>ADAPTIVE SOUNDSCAPE</strong>

              <small>
                {audioStatus === "unavailable"
                  ? "A local audio asset failed to load"
                  : audioStatus === "loading"
                    ? "Loading local sound layers…"
                    : !soundscapeEnabled
                      ? "Soundscape is off"
                      : `NOW PLAYING: ${
                          soundMoodDetails[audioMood]?.label || "Uneasy"
                        }`}
              </small>
            </div>
          </div>

          <button
            className="soundscape-power"
            type="button"
            onClick={
              soundscapeEnabled
                ? stopSoundscape
                : () => void startSoundscape()
            }
          >
            {soundscapeEnabled ? "Mute" : "Enable sound"}
          </button>
        </div>

        <div className="soundscape-preset-label">
          PREVIEW THE ATMOSPHERE
        </div>

        <div
          className="soundscape-presets"
          role="group"
          aria-label="Preview sound moods"
        >
          {[
            { id: "calm", label: "Campfire", symbol: "♨" },
            { id: "uneasy", label: "Uneasy", symbol: "〰" },
            { id: "tense", label: "Suspense", symbol: "♥" },
            { id: "reveal", label: "Reveal", symbol: "✦" },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`soundscape-preset ${
                audioMood === preset.id ? "active" : ""
              }`}
              onClick={() => void previewSoundMood(preset.id)}
              disabled={audioStatus === "loading"}
              aria-pressed={audioMood === preset.id}
            >
              <span>{preset.symbol}</span>
              {preset.label}
            </button>
          ))}
        </div>

        <div className="soundscape-bottom-row">
          <button
            className="soundscape-test-button"
            type="button"
            onClick={() => void testRevealSound()}
            disabled={audioStatus === "loading"}
          >
            ▶ Test reveal
          </button>
        </div>

        <label className="ambience-volume">
          <span>
            MASTER VOLUME <b>{Math.round(soundVolume * 100)}%</b>
          </span>

          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={soundVolume}
            onChange={(event) =>
              updateSoundVolume(Number(event.target.value))
            }
            aria-label="Master soundscape volume"
            disabled={!soundscapeEnabled}
          />
        </label>

      </div>
    );
  }


  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------

  return (
    <div className="app-shell">
      {renderHeader()}

      {view === "setup" && (
        <main className="main-grid">
          <section className="hero-column">
            <p className="eyebrow">
              <span>✦</span> A HORROR EXPERIENCE FOR YOUR FRIEND GROUP
            </p>

            <h1>
              Some stories
              <br />
              should never be told
              <br />
              <em>after dark.</em>
            </h1>

            <SceneVisual genre={genre} />

            <div className="hero-note">
              <span className="note-symbol">✧</span>

              <p>
                <strong>NO TWO NIGHTS ALIKE</strong>
                <br />
                Your fears. Your friends. Your story.
              </p>
            </div>
          </section>

          <section className="setup-card">
            <div className="setup-heading">
              <div>
                <p className="eyebrow">STEP 01 / PREPARE THE NIGHT</p>
                <h2>Set the scene.</h2>
              </div>

              <span className="step-number">01</span>
            </div>

            <div className="field-label">CHOOSE YOUR NIGHTMARE</div>

            <div className="genre-grid">
              {horrorStyles.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`genre-option ${
                    genre === item.name ? "selected" : ""
                  }`}
                  onClick={() => setGenre(item.name)}
                  aria-pressed={genre === item.name}
                >
                  <span className="genre-symbol">{item.symbol}</span>

                  <span className="genre-text">
                    <strong>{item.name}</strong>
                    <small>{item.description}</small>
                  </span>

                  <span className="select-mark">
                    {genre === item.name ? "✓" : "+"}
                  </span>
                </button>
              ))}
            </div>

            <div className="fear-heading">
              <span className="field-label">FEAR INTENSITY</span>
              <span className="fear-name">{fearLabels[fear - 1]}</span>
            </div>

            <div className="fear-scale">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setFear(level)}
                  className={fear === level ? "active" : ""}
                  aria-label={`Fear level ${level}: ${fearLabels[level - 1]}`}
                  aria-pressed={fear === level}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="two-fields" style={{ gridTemplateColumns: "1fr" }}>

              <label className="form-field">
                <span className="field-label">STORY FORMAT</span>

                <select
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                >
                  <option value="Short Story">
                    Short Story · approx. 4–5 min
                  </option>

                  <option value="Long Story">
                    Long Story · approx. 9–11 min
                  </option>
                </select>

              </label>
            </div>

            <div className="toggle-list">
              <label className="toggle-row">
                <span>
                  <strong>Jumpscares</strong>
                </span>

                <input
                  type="checkbox"
                  checked={jumpscares}
                  onChange={(event) =>
                    setJumpscares(event.target.checked)
                  }
                />
              </label>

              <label className="toggle-row">
                <span>
                  <strong>Spoken narration</strong>
                </span>

                <input
                  type="checkbox"
                  checked={narration}
                  onChange={(event) =>
                    setNarration(event.target.checked)
                  }
                />
              </label>

              <label className="toggle-row">
                <span>
                  <strong>Adaptive soundscape</strong>
                </span>

                <input
                  type="checkbox"
                  checked={soundscapeEnabled}
                  onChange={(event) =>
                    event.target.checked
                      ? void startSoundscape("calm")
                      : stopSoundscape()
                  }
                />
              </label>
            </div>

            {narration && (
              <div
                style={{
                  marginTop: 16,
                  padding: 14,
                  border: "1px solid #38342d",
                  borderRadius: 9,
                  background: "#111311",
                }}
              >
                <div
                  className="field-label"
                  style={{ marginBottom: 8 }}
                >
                  LOCAL NARRATOR VOICE
                </div>

                <div
                  style={{
                    minHeight: 40,
                    display: "flex",
                    alignItems: "center",
                    boxSizing: "border-box",
                    padding: "0 10px",
                    border: "1px solid #393a33",
                    borderRadius: 7,
                    background: "#0c0e0d",
                    color: "#e5dfd5",
                    fontSize: 11,
                  }}
                >
                  Kokoro · am_michael · English (US)
                </div>

                <button
                  type="button"
                  onClick={previewNarratorVoice}
                  disabled={voicePreviewing}
                  style={{
                    marginTop: 9,
                    padding: "9px 12px",
                    border: "1px solid #795538",
                    borderRadius: 6,
                    background: "#2c1e15",
                    color: "#f1c39a",
                    fontSize: 10,
                    cursor: voicePreviewing ? "wait" : "pointer",
                    opacity: voicePreviewing ? 0.7 : 1,
                  }}
                >
                  {voicePreviewing
                    ? "Generating / playing sample…"
                    : "▶ Preview local narrator"}
                </button>

              </div>
            )}

            <button
              className="ignite-button"
              type="button"
              onClick={startStory}
              disabled={inPreparation}
            >
              <span>🔥 &nbsp; Ignite the campfire</span>
              <span className="button-arrow">↗</span>
            </button>

          </section>
        </main>
      )}


      {/* -------------------------------------------------- */}
      {/* STORIES DASHBOARD                                  */}
      {/* -------------------------------------------------- */}

      {view === "stories" && (
        <main
          style={{
            width: "min(1120px, 94vw)",
            margin: "42px auto 70px",
          }}
        >
          <div
            className="stories-header"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 24,
              marginBottom: 30,
            }}
          >
            <div className="stories-heading" style={{ minWidth: 0 }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                YOUR LOCAL STORY LIBRARY
              </p>
              <h1
                style={{
                  margin: 0,
                  color: "#f0e8df",
                  fontFamily: 'Georgia, "Times New Roman", serif',
                  fontSize: 38,
                  fontWeight: 500,
                  letterSpacing: "-1px",
                }}
              >
                Stories
              </h1>
            </div>

            <div
              className="stories-actions"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="stories-new-button"
                onClick={backToSetup}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "12px 17px",
                  border: "1px solid #d09a71",
                  borderRadius: 8,
                  background: "linear-gradient(110deg, #b66c43, #8c4c31)",
                  color: "#fff2e7",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.5px",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ fontSize: 15, lineHeight: 1 }}>＋</span>
                New Story
              </button>

              <button
                type="button"
                className="stories-refresh-button"
                onClick={() => void refreshStories()}
                disabled={storiesLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "11px 14px",
                  border: "1px solid #514033",
                  borderRadius: 8,
                  background: "#151613",
                  color: "#cdb49d",
                  fontSize: 11,
                  cursor: storiesLoading ? "wait" : "pointer",
                  whiteSpace: "nowrap",
                  opacity: storiesLoading ? 0.5 : 1,
                }}
              >
                <span style={{ fontSize: 15 }}>↻</span>
                Refresh
              </button>
            </div>
          </div>

          {storiesError && (
            <p className="story-error" role="alert">
              {storiesError}
            </p>
          )}

          {storiesLoading ? (
            <div className="visual-direction-card">
              Loading your saved stories…
            </div>
          ) : stories.length === 0 ? (
            <div
              className="visual-direction-card"
              style={{ padding: 28, textAlign: "center" }}
            >
              <div style={{ fontSize: 34, color: "#d19a6c" }}>✦</div>

              <h2>No stories saved yet</h2>

              <button
                className="ignite-button"
                type="button"
                onClick={backToSetup}
              >
                <span>Create your first story</span>
                <span className="button-arrow">↗</span>
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}
            >
              {stories.map((item) => (
                <article
                  key={item.id}
                  className="visual-direction-card"
                  style={{
                    padding: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "start",
                    }}
                  >
                    <span
                      style={{
                        color: "#d7a879",
                        fontSize: 10,
                        letterSpacing: "1.5px",
                      }}
                    >
                      {item.genre || "HORROR"} · FEAR {item.fear || 3}/5
                    </span>

                    <span style={{ color: "#8d857a", fontSize: 10 }}>
                      {item.duration || "Story"}
                    </span>
                  </div>

                  <h2 style={{ margin: "2px 0", fontSize: 21 }}>
                    {item.title || "Untitled story"}
                  </h2>

                  <p
                    style={{
                      margin: 0,
                      color: "#aaa092",
                      fontSize: 11,
                    }}
                  >
                    {formatStoryDate(item.createdAt)} ·{" "}
                    {item.chapters?.length || 0} chapters
                  </p>

                  <p
                    style={{
                      margin: 0,
                      color: "#c7b9a8",
                      fontSize: 12,
                    }}
                  >
                    Ending:{" "}
                    <strong>{item.endingPlan?.name || "Unknown"}</strong>
                  </p>

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: "auto",
                      paddingTop: 8,
                    }}
                  >
                    <button
                      className="ignite-button"
                      style={{ marginTop: 0, flex: 1 }}
                      type="button"
                      onClick={() => void openSavedStory(item.id)}
                    >
                      <span>▶ Open story</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void deleteSavedStory(item.id)}
                      aria-label={`Delete ${item.title}`}
                      style={{
                        border: "1px solid #67443a",
                        background: "#241615",
                        color: "#dda99b",
                        borderRadius: 6,
                        padding: "0 13px",
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="muted" style={{ marginTop: 20, fontSize: 11 }}>
            Stories are stored in this browser on this device. Clearing
            browser site data may remove the library.
          </p>
        </main>
      )}


      {/* -------------------------------------------------- */}
      {/* STORY VIEW                                         */}
      {/* -------------------------------------------------- */}

      {view === "story" && (
        <main className="story-layout">
          <section className="story-visual-column">
            <SceneVisual
              story
              genre={genre}
              scene={currentScene}
              chapter={chapter}
              backgroundSrc={currentBackground}
            />

            <div className="story-visual-note">
              CHAPTER {String(chapter).padStart(2, "0")}
              <span>·</span>
              {currentScene?.sceneType?.toUpperCase() ||
                "THE STORY UNFOLDS"}
            </div>

            <div className="story-settings-summary">
              <span>{genre.toUpperCase()}</span>
              <span>FEAR {fear}/5</span>
              <span>{duration.toUpperCase()}</span>
            </div>

            {currentScene && (
              <div className="visual-direction-card">
                <span>✦ VISUAL DIRECTOR</span>

                <p>{currentScene.visualDescription}</p>

                <div className="scene-meta-row">
                  <span>MOOD: {currentScene.mood.toUpperCase()}</span>
                  <span>SCENE: {currentScene.sceneType.toUpperCase()}</span>
                  <span>CUE: {currentScene.soundCue.toUpperCase()}</span>
                </div>
              </div>
            )}

          </section>

          <section className="story-panel">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <button
                className="back-button"
                type="button"
                onClick={backToSetup}
              >
                ← NEW STORY
              </button>

              <button
                className="soundscape-test-button"
                type="button"
                onClick={() => void openStoriesDashboard()}
              >
                ☰ STORIES LIBRARY
              </button>
            </div>

            <p className="eyebrow">
              CHAPTER {String(chapter).padStart(2, "0")} /{" "}
              {currentScene?.mood?.toUpperCase() || "THE STORY UNFOLDS"}
            </p>

            <h1>
              {currentScene?.title ||
                (isGenerating
                  ? "The storyteller is writing your nightmare."
                  : "Preparing your story…")}
            </h1>

            {currentScene && (
              <p className="story-copy" style={{ whiteSpace: "pre-wrap" }}>
                {currentScene.narration}
              </p>
            )}

            {isGenerating && (
              <p className="ai-status" aria-live="polite">
                Writing the complete story before narration preparation…
              </p>
            )}

            {storyError && (
              <p className="story-error" role="alert">
                {storyError}
              </p>
            )}

            {storySaveStatus && (
              <p
                className="muted"
                role="status"
                style={{ fontSize: 11 }}
              >
                {storySaveStatus}
              </p>
            )}

            {renderProgressPanel()}

            {readyToPlay && narration && (
              <div
                className="narration-preview"
                style={{ marginTop: 18 }}
              >
                <span className="sound-icon">♫</span>

                <div className="narration-info">
                  <strong>THE CAMPFIRE NARRATOR</strong>

                  <small>
                    {speechStatus === "speaking"
                      ? playbackModeRef.current === "chapter"
                        ? "Playing selected chapter"
                        : "Story is playing"
                      : speechStatus === "paused"
                        ? "Narration paused"
                        : storyFinished
                          ? "The story has ended"
                          : "All chapter narration is ready"}
                  </small>
                </div>

                <div className="narration-controls">
                  {speechStatus === "speaking" ? (
                    <button type="button" onClick={toggleNarration}>
                      Pause
                    </button>
                  ) : speechStatus === "paused" ? (
                    <button type="button" onClick={toggleNarration}>
                      Resume
                    </button>
                  ) : (
                    <button type="button" onClick={playFullStory}>
                      {storyFinished
                        ? "↻ Replay full story"
                        : "▶ Play story"}
                    </button>
                  )}
                </div>
              </div>
            )}

            {readyToPlay && !narration && (
              <button
                className="ignite-button"
                type="button"
                style={{ marginTop: 16 }}
                onClick={playFullStory}
              >
                <span>
                  {storyFinished
                    ? "↻ Replay full story"
                    : "▶ Play story"}
                </span>

                <span className="button-arrow">↗</span>
              </button>
            )}

            {/* Replay a specific chapter */}
            {readyToPlay && (
              <div
                className="visual-direction-card"
                style={{ marginTop: 18 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span>✦ CHAPTER REPLAY</span>

                  <span style={{ color: "#d7a879", fontSize: 10 }}>
                    {storyChapters.length} CHAPTERS
                  </span>
                </div>

                <p style={{ marginBottom: 12, fontSize: 11 }}>
                  Replay any chapter on its own, or replay the full story
                  from the beginning.
                </p>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    alignItems: "center",
                    gap: 10,
                    marginTop: 12,
                  }}
                >
                  <select
                    value={Math.min(
                      selectedReplayChapter,
                      Math.max(0, storyChapters.length - 1)
                    )}
                    onChange={(event) =>
                      setSelectedReplayChapter(Number(event.target.value))
                    }
                    aria-label="Select a chapter to replay"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      border: "1px solid #5e4a39",
                      borderRadius: 7,
                      background: "#171513",
                      color: "#e6ded2",
                      padding: "10px 12px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {storyChapters.map((item, index) => (
                      <option key={`${item.title}-${index}`} value={index}>
                        {`Chapter ${index + 1} — ${item.title}`}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => playSpecificChapter(selectedReplayChapter)}
                    style={{
                      flexShrink: 0,
                      border: "1px solid #806044",
                      borderRadius: 7,
                      background: "#2a2018",
                      color: "#f0c69d",
                      padding: "10px 12px",
                      fontSize: 10,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ▶ Replay chapter
                  </button>
                </div>

                <button
                  className="ignite-button"
                  type="button"
                  style={{ marginTop: 16 }}
                  onClick={playFullStory}
                >
                  <span>
                    {storyFinished
                      ? "↻ Replay full story"
                      : "▶ Play full story"}
                  </span>

                  <span className="button-arrow">↗</span>
                </button>
              </div>
            )}

            {renderSoundscapePanel()}

            <div
              className="visual-direction-card"
              style={{ marginTop: 24 }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>✦ THE STORY UNFOLDS</span>

                <strong
                  style={{
                    color: "#e5b080",
                    fontSize: 10,
                    letterSpacing: "1px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {Math.min(chapter, targetSceneCount)} /{" "}
                  {targetSceneCount} CHAPTERS
                </strong>
              </div>

              <div
                style={{
                  height: 5,
                  marginTop: 13,
                  borderRadius: 10,
                  overflow: "hidden",
                  background: "#312a23",
                }}
              >
                <div
                  style={{
                    width: `${Math.min(
                      100,
                      (chapter / Math.max(1, targetSceneCount)) * 100
                    )}%`,
                    height: "100%",
                    borderRadius: 10,
                    background:
                      "linear-gradient(90deg, #8b4b2d, #e5ab70)",
                    transition: "width 500ms ease",
                  }}
                />
              </div>

              <p style={{ marginBottom: 0 }}>
                {storyFinished
                  ? "The ending has arrived. The woods are silent again."
                  : !readyToPlay
                    ? generationStage
                    : speechStatus === "speaking"
                      ? "Playing"
                      : speechStatus === "paused"
                        ? "Paused"
                        : "Ready"}
              </p>

              {storyFinished && (
                <button
                  className="ignite-button"
                  style={{ marginTop: 16 }}
                  type="button"
                  onClick={playFullStory}
                >
                  <span>Replay the entire story</span>
                  <span className="button-arrow">↗</span>
                </button>
              )}
            </div>

          </section>
        </main>
      )}


      {/* -------------------------------------------------- */}
      {/* FULL-SCREEN VISUAL JUMPSCARE                        */}
      {/* -------------------------------------------------- */}

      {jumpScareActive &&
        jumpscares &&
        currentScene?.scareMode === "visual" && (
          <div
            className={`jump-scare-overlay scare-kind-${scareSoundType}`}
            role="alert"
            aria-live="assertive"
            aria-label="Entity jumpscare"
            style={{
              position: "fixed",
              zIndex: 9999,
              inset: 0,
              display: "grid",
              placeItems: "center",
              overflow: "hidden",
              background: "#030101",
              animation: "scare-screen-in 1650ms ease-out both",
            }}
          >
            <img
              key={`${scareVisualAsset}-${scareVisualVariant}`}
              className={`jump-scare-image jump-scare-photo scare-image-${scareVisualVariant}`}
              src={getStoryAssetUrl(scareVisualAsset)}
              alt="A frightening figure appears"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                setJumpScareActive(false);

                console.warn(
                  `Jumpscare image could not be loaded: ${scareVisualAsset}`
                );
              }}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",

                objectPosition:
                  scareVisualVariant === 1
                    ? "left 42%"
                    : scareVisualVariant === 2
                      ? "right 35%"
                      : scareVisualVariant === 3
                        ? "center 58%"
                        : "center 38%",

                filter:
                  scareVisualVariant === 1
                    ? "contrast(1.5) saturate(.72) brightness(.70) sepia(.12)"
                    : scareVisualVariant === 2
                      ? "contrast(1.35) saturate(1.25) brightness(.78) hue-rotate(-12deg)"
                      : scareVisualVariant === 3
                        ? "contrast(1.65) saturate(.55) brightness(.64) sepia(.22)"
                        : "contrast(1.28) saturate(.82) brightness(.78)",

                transform: `scale(${1.05 + scareVisualVariant * 0.045})`,
                animation:
                  "scare-image-lunge 1650ms cubic-bezier(.15,.8,.2,1) both",
              }}
            />

            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 1,
                background:
                  "radial-gradient(ellipse at center, #8c0c1740 0%, #17020365 48%, #000 100%)",
                pointerEvents: "none",
              }}
            />

            <p
              style={{
                position: "absolute",
                zIndex: 2,
                left: 16,
                right: 16,
                bottom: "7%",
                margin: 0,
                textAlign: "center",
                color: "#f5d7c9",
                fontFamily: "Georgia, serif",
                fontSize: "clamp(16px, 3vw, 28px)",
                letterSpacing: "3px",
                textShadow: "0 0 18px #9d1616",
              }}
            >
              {scareSoundType === "laugh"
                ? "SOMETHING IS LAUGHING BEHIND YOU."
                : scareSoundType === "cry"
                  ? "WHO IS CRYING IN THE DARK?"
                  : scareSoundType === "whisper"
                    ? "IT KNOWS YOUR NAME."
                    : "DON'T TURN AROUND."}
            </p>
          </div>
        )}

      <footer className="page-footer">
        <span>MADE FOR THE MOMENTS AFTER MIDNIGHT</span>
        <span>LOCAL-FIRST DESIGN · NO PAID AI API PLANNED</span>
      </footer>


    </div>
  );
}

export default App;