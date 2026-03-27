import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "data", "presentations");
const PORT = process.env.PORT || 4000;

const app = express();

app.use(cors());
app.use(express.json({ limit: "6mb" }));

function safeId(rawId) {
  if (!rawId) return null;
  const id = rawId.trim();
  return /^[a-zA-Z0-9_-]+$/.test(id) ? id : null;
}

function filePathById(id) {
  return path.join(DATA_DIR, `${id}.json`);
}

function normalizeSlides(slides) {
  if (!Array.isArray(slides) || slides.length === 0) {
    return [{ id: "slide-1", objects: [] }];
  }

  return slides.map((slide, index) => ({
    id: slide?.id ?? `slide-${index + 1}`,
    objects: Array.isArray(slide?.objects) ? slide.objects : []
  }));
}

async function ensureStorage() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "keerthis-hand-gesture-backend" });
});

app.get("/api/presentation/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid presentation id" });
    return;
  }

  const filePath = filePathById(id);

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const payload = JSON.parse(raw);

    res.json({
      id,
      slides: normalizeSlides(payload.slides)
    });
  } catch (error) {
    if (error.code !== "ENOENT") {
      res.status(500).json({ error: "Failed to read presentation" });
      return;
    }

    const fallback = {
      id,
      slides: [{ id: "slide-1", objects: [] }]
    };

    res.json(fallback);
  }
});

app.put("/api/presentation/:id", async (req, res) => {
  const id = safeId(req.params.id);
  if (!id) {
    res.status(400).json({ error: "Invalid presentation id" });
    return;
  }

  const slides = normalizeSlides(req.body?.slides);
  const payload = {
    id,
    updatedAt: new Date().toISOString(),
    slides
  };

  try {
    await fs.writeFile(filePathById(id), JSON.stringify(payload, null, 2), "utf8");
    res.json({ ok: true, id, slideCount: slides.length });
  } catch {
    res.status(500).json({ error: "Failed to save presentation" });
  }
});

async function bootstrap() {
  await ensureStorage();
  app.listen(PORT, () => {
    console.log(`Keerthi's Hand Gesture backend running on http://localhost:${PORT}`);
  });
}

bootstrap();
