const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const express = require("express");
const app = express();

// आपकी टेलीग्राम डिटेल्स
const apiId = 27131304;
const apiHash = "e1701bd589138de2dc127ceb6922561b";
const botToken = "8308568349:AAF8uf5CmoGRt0OZy9K2llDkh50ugd31Z0o";
const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, { 
    connectionRetries: 10 
});

// 1. हेल्थ चेक (ताकि Render बंद न हो)
app.get("/", (req, res) => res.send("Ghost Streamer is Online! ✅"));

// 2. पोर्ट चालू करना (इसे सबसे पहले रखें)
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server is running on port ${port} 🚀`);
});

async function init() {
    try {
        console.log("Connecting to Telegram...");
        await client.start({ botAuthToken: botToken });
        console.log("Ghost High-Speed Streamer Live! ✅");

        // 3. मुख्य स्ट्रीमिंग रूट
        app.get("/stream/:chatId/:msgId", async (req, res) => {
            try {
                const { chatId, msgId } = req.params;
                const messageId = parseInt(msgId);

                // मैसेज और मीडिया प्राप्त करें
                const messages = await client.getMessages(chatId, { ids: [messageId] });
                const message = messages[0];

                if (!message || !message.media) {
                    return res.status(404).send("File not found or private channel issue.");
                }

                const media = message.media.document || message.media.video;
                const fileSize = media.size;
                const mimeType = media.mimeType || "video/mp4";
                const range = req.headers.range;

                // 4. Seeking सपोर्ट (Range Requests)
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    const start = parseInt(parts[0], 10);
                    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    const chunksize = (end - start) + 1;

                    res.writeHead(206, {
                        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                        "Accept-Ranges": "bytes",
                        "Content-Length": chunksize,
                        "Content-Type": mimeType,
                    });

                    const stream = client.iterDownload({
                        file: message.media,
                        offset: start,
                        limit: chunksize,
                        requestSize: 256 * 1024, // 256KB चंक्स
                    });

                    for await (const chunk of stream) {
                        if (!res.writable) break;
                        res.write(chunk);
                    }
                    res.end();
                } else {
                    // पूरी फाइल डाउनलोड/स्ट्रीम
                    res.writeHead(200, {
                        "Content-Length": fileSize,
                        "Content-Type": mimeType,
                    });
                    const stream = client.iterDownload({ file: message.media });
                    for await (const chunk of stream) {
                        if (!res.writable) break;
                        res.write(chunk);
                    }
                    res.end();
                }
            } catch (e) {
                console.error("Streaming error:", e.message);
                if (!res.headersSent) res.status(500).send("Error streaming file.");
            }
        });

    } catch (err) {
        console.error("Failed to connect to Telegram:", err.message);
    }
}

init();
