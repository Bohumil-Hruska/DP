const express = require("express");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const router = express.Router();

// cesta k piperu v tvém venv (podle toho, kde jsi venv vytvořil)
const PIPER_BIN = process.env.PIPER_BIN || "/home/benny/testnum1/frontend/.venv/bin/piper";

// cesty k modelu a cache
const MODEL_PATH = process.env.PIPER_MODEL || "/home/benny/piper/voices/cs_CZ-jirka-medium.onnx";
const CACHE_DIR  = process.env.TTS_CACHE_DIR || "/home/benny/piper/cache";

const MAX_CHARS = 300;

fs.mkdirSync(CACHE_DIR, { recursive: true });

// aby ti na Pi neběželo moc Piper procesů paralelně
let running = Promise.resolve();
const enqueue = (job) => {
    const next = running.then(job, job);
    running = next.catch(() => {});
    return next;
};

router.post("/api/tts", async (req, res) => {
    try {
        let text = (req.body?.text ?? "").toString().trim();
        if (!text) return res.status(400).json({ error: "Missing text" });

        text = text.replace(/\s+/g, " ").slice(0, MAX_CHARS);

        const key = crypto.createHash("sha1").update(text).digest("hex");
        const outPath = path.join(CACHE_DIR, `${key}.wav`);

        if (fs.existsSync(outPath)) {
            res.setHeader("Content-Type", "audio/wav");
            res.setHeader("Cache-Control", "public, max-age=86400");
            return fs.createReadStream(outPath).pipe(res);
        }

        await enqueue(() => new Promise((resolve, reject) => {
            const p = spawn(PIPER_BIN, ["--model", MODEL_PATH, "--output_file", outPath], {
                stdio: ["pipe", "ignore", "pipe"],
            });

            let err = "";
            p.stderr.on("data", (d) => (err += d.toString()));

            p.on("close", (code) => {
                if (code === 0 && fs.existsSync(outPath)) return resolve();
                reject(new Error(`Piper failed (${code}): ${err}`));
            });

            p.stdin.write(text, "utf8");
            p.stdin.end();
        }));

        res.setHeader("Content-Type", "audio/wav");
        res.setHeader("Cache-Control", "public, max-age=86400");
        return fs.createReadStream(outPath).pipe(res);

    } catch (e) {
        console.error("TTS error:", e);
        return res.status(500).json({ error: "TTS failed" });
    }
});

module.exports = router;
