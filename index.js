const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const express = require("express");
const app = express();

const apiId = 27131304;
const apiHash = "e1701bd589138de2dc127ceb6922561b";
const botToken = "8308568349:AAF8uf5CmoGRt0OZy9K2llDkh50ugd31Z0o";
const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 10 });

// 1. पोर्ट को पहले चालू करें ताकि Render को "Timed Out" न लगे
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port} 🚀`);
});

// 2. हेल्थ चेक रूट (Render के लिए)
app.get("/", (req, res) => res.send("Ghost Bot is Online and Healthy!"));

async function init() {
    try {
        console.log("Connecting to Telegram...");
        await client.start({ botAuthToken: botToken });
        console.log("Ghost High-Speed Streamer Live! ✅");

        app.get("/stream/:chatId/:msgId", async (req, res) => {
            try {
                const { chatId, msgId } = req.params;
                const messages = await client.getMessages(chatId, { ids: [parseInt(msgId)] });
                const message = messages[0];

                if (!message || !message.media) return res.status(404).send("File not found");

                const media = message.media.document || message.media.video;
                const fileSize = media.size;
                const range = req.headers.range;

                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    res.writeHead(206, {
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Accept-Ranges": "bytes",
                        "Content-Length": (end - start) + 1,
                        "Content-Type": "video/mp4",
                    });
                    const stream = client.iterDownload({ file: message.media, offset: start, limit: (end - start) + 1, requestSize: 512 * 1024 });
                    for await (const chunk of stream) { res.write(chunk); }
                    res.end();
                } else {
                    res.writeHead(200, { "Content-Length": fileSize, "Content-Type": "video/mp4" });
                    const stream = client.iterDownload({ file: message.media });
                    for await (const chunk of stream) { res.write(chunk); }
                    res.end();
                }
            } catch (e) { 
                console.error("Stream Error:", e);
                res.status(500).send("Stream Error"); 
            }
        });
    } catch (err) {
        console.error("Failed to start Telegram Client:", err);
    }
}

init();
