const { TelegramClient } = require("telegram");
const { StringSession } = require("telegram/sessions");
const express = require("express");
const app = express();

const apiId = 27131304;
const apiHash = "e1701bd589138de2dc127ceb6922561b";
const botToken = "8308568349:AAF8uf5CmoGRt0OZy9K2llDkh50ugd31Z0o";
const stringSession = new StringSession(""); 

// Render को खुश रखने के लिए पोर्ट पहले चालू करें
const port = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Ghost Bot is Online! ✅"));
app.listen(port, () => console.log(`Server running on ${port}`));

const client = new TelegramClient(stringSession, apiId, apiHash, { 
    connectionRetries: 10,
    useWSS: true // बेहतर कनेक्शन के लिए
});

async function init() {
    try {
        console.log("Telegram से जुड़ने की कोशिश...");
        await client.start({
            botAuthToken: botToken,
        });
        console.log("Telegram Connected Successfully! 🚀");

        app.get("/stream/:chatId/:msgId", async (req, res) => {
            try {
                const { chatId, msgId } = req.params;
                const messageId = parseInt(msgId);
                
                // मैसेज गेट करें
                const messages = await client.getMessages(chatId, { ids: [messageId] });
                const message = messages[0];

                if (!message || !message.media) return res.status(404).send("फाइल नहीं मिली या चैनल प्राइवेट है।");

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
                        requestSize: 256 * 1024,
                    });

                    for await (const chunk of stream) {
                        if (!res.writable) break;
                        res.write(chunk);
                    }
                    res.end();
                } else {
                    res.writeHead(200, { "Content-Length": fileSize, "Content-Type": "video/mp4" });
                    const stream = client.iterDownload({ file: message.media });
                    for await (const chunk of stream) {
                        if (!res.writable) break;
                        res.write(chunk);
                    }
                    res.end();
                }
            } catch (e) {
                console.error("स्ट्रीमिंग एरर:", e.message);
                res.status(500).send("Streaming Error");
            }
        });

    } catch (err) {
        console.error("बोट स्टार्ट होने में दिक्कत:", err.message);
    }
}

init();
