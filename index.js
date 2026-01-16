const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const express = require("express");
const app = express();

const apiId = 27131304;
const apiHash = "e1701bd589138de2dc127ceb6922561b";
const botToken = "8308568349:AAF8uf5CmoGRt0OZy9K2llDkh50ugd31Z0o";
const stringSession = new StringSession(""); 

const client = new TelegramClient(stringSession, apiId, apiHash, { connectionRetries: 10 });

// CORS और एरर फिक्स के लिए मिडिलवेयर
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Range, Content-Type");
    res.header("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges");
    if (req.method === "OPTIONS") return res.sendStatus(200);
    next();
});

app.get("/", (req, res) => res.send("Ghost Bot is Online! ✅"));

const port = process.env.PORT || 10000;
app.listen(port, () => console.log(`Server running on ${port}`));

async function init() {
    try {
        await client.start({ botAuthToken: botToken });
        console.log("Telegram Connected Successfully! 🚀");

        app.get("/stream/:chatId/:msgId", async (req, res) => {
            try {
                const { chatId, msgId } = req.params;
                const messages = await client.getMessages(chatId, { ids: [parseInt(msgId)] });
                const message = messages[0];

                if (!message || !message.media) {
                    if (!res.headersSent) return res.status(404).send("File Not Found");
                    return;
                }

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

                    const stream = client.iterDownload({
                        file: message.media,
                        offset: start,
                        limit: (end - start) + 1,
                        requestSize: 1024 * 1024,
                    });

                    for await (const chunk of stream) {
                        res.write(chunk);
                    }
                    res.end();
                } else {
                    res.writeHead(200, {
                        "Content-Length": fileSize,
                        "Content-Type": "video/mp4",
                    });
                    const stream = client.iterDownload({ file: message.media });
                    for await (const chunk of stream) {
                        res.write(chunk);
                    }
                    res.end();
                }
            } catch (err) {
                console.error("Streaming Error:", err);
                if (!res.headersSent) res.status(500).send("Internal Server Error");
            }
        });

    } catch (error) {
        console.error("Connection Failed:", error);
    }
}

init();
