
const express = require('express')
const line = require('@line/bot-sdk');
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const config = require("./config");
const app = express()

app.use(express.urlencoded({ extended: false }));
// app.use(express.json());
app.use('/static', express.static('static'));
app.use('/downloaded', express.static('downloaded'));

let baseURL = process.env.CHANNEL_BASE_URL;
const channelConfig = {
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.CHANNEL_SECRET,
};
const client = new line.Client(channelConfig);
app.use('/webhook', line.middleware(channelConfig));

app.get('/callback', (req, res) => res.end(`I'm listening. Please access with POST.`));
// webhook callback
app.post('/callback', line.middleware(channelConfig), (req, res) => {
    if (req.body.destination) {
        console.log("Destination User ID: " + req.body.destination);
    }

    // req.body.events should be an array of events
    if (!Array.isArray(req.body.events)) {
        return res.status(500).end();
    }

    // handle events separately
    Promise.all(req.body.events.map(handleEvent))
        .then(() => res.end())
        .catch((err) => {
            console.error("handleEvent callback", err);
            res.status(500).end();
        });
    // Promise.all(req.body.events.map(handleEvent))
    //     .then(result => res.json(result))
    //     .catch(err => {
    //         console.error("error at app.post", err);
    //     });
});


// simple reply function
const replyText = (token, texts) => {
    texts = Array.isArray(texts) ? texts : [texts];
    return client.replyMessage(
        token,
        texts.map((text) => ({ type: 'text', text }))
    );
};

// callback function to handle a single event
function handleEvent(event) {
    if (event.replyToken && event.replyToken.match(/^(.)\1*$/)) {
        return console.log("Test hook recieved: " + JSON.stringify(event.message));
    }
    switch (event.type) {
        case 'message':
            const message = event.message;
            switch (message.type) {
                case 'text':
                    return handleText(message, event.replyToken, event.source);
                case 'image':
                    return
                case 'video':
                    return
                case 'audio':
                    return
                case 'location':
                    return
                case 'sticker':
                    return
                default:
                    throw new Error(`Unknown message: ${JSON.stringify(message)}`);
            }

        case 'follow':
            return replyText(event.replyToken, 'Got followed event');

        case 'unfollow':
            return console.log(`Unfollowed this bot: ${JSON.stringify(event)}`);

        case 'join':
            return replyText(event.replyToken, `Joined ${event.source.type}`);

        case 'leave':
            return console.log(`Left: ${JSON.stringify(event)}`);

        case 'postback':
            let data = event.postback.data;
            if (data === 'DATE' || data === 'TIME' || data === 'DATETIME') {
                data += `(${JSON.stringify(event.postback.params)})`;
            }
            return replyText(event.replyToken, `Got postback: ${data}`);

        case 'beacon':
            return replyText(event.replyToken, `Got beacon: ${event.beacon.hwid}`);

        default:
            throw new Error(`Unknown event: ${JSON.stringify(event)}`);
    }
}

function handleText(message, replyToken, source) {
    const buttonsImageURL = `${baseURL}/static/buttons/1040.jpg`;
    switch (message.text) {
        case 'profile':
            if (source.userId) {
                return client.getProfile(source.userId)
                    .then((profile) => replyText(
                        replyToken,
                        [
                            `Display name: ${profile.displayName}
                             Status message: ${profile.statusMessage}
                            `,
                        ]
                    ));
            } else {
                return replyText(replyToken, 'Bot can\'t use profile API without user ID');
            }
        case 'confirm':
            return client.replyMessage(
                replyToken,
                {
                    type: 'template',
                    altText: 'Confirm alt text',
                    template: {
                        type: 'confirm',
                        text: 'Do it?',
                        actions: [
                            { label: 'Yes', type: 'message', text: 'Yes!', uri: 'www.google.com' },
                            { label: 'No', type: 'message', text: 'No!', uri: '' },
                        ],
                    },
                }
            )
        case 'hi airi':
        case 'hello airi':
        case 'Hi AIRI':
        case 'Hello AIRI':
        case 'HI AIRI':
        case 'hi there':
        case 'Hi there':
        case 'สวัสดี':
        case 'สวัสดี airi':
        case 'สวัสดี AIRI':
        case 'สวัสดี ไอริ':
            if (source.userId) {
                const textArray = ['Hello ', 'Hi']
                var randomNumb = Math.floor(Math.random() * textArray.length)
                return client.getProfile(source.userId)
                    .then((profile) => replyText(
                        replyToken,
                        [
                            `${textArray[randomNumb]} ${profile.displayName}`,
                        ]
                    ));
            } else {
                return replyText(replyToken, 'Bot can\'t use profile API without user ID');
            }
        case 'airi':
        case 'iri':
        case 'AIRI':
        case 'IRI':
        case 'ไอริ':
            return replyText(replyToken, [`I'm here...`,])
            // return client.getProfile(source.userId)
            //     .then((profile) => replyText(
            //         replyToken, [`I'm here...`,]
            //     ));
        case 'airi report':
            return replyText(replyToken, [`I don't know ...`,])
            // return client.getProfile(source.userId)
            //     .then((profile) => replyText(
            //         replyToken, [`I don't know ...`,]
            //     ));
        case 'airi help':
        case 'AIRI Help':
            const textArray = ['Hi there. What can i do for you? ', 'Hi there. how can i help?', 'Hiya. How can i help?', 'Hiya. What can i do for you?']
            var randomNumb = Math.floor(Math.random() * textArray.length)
            return replyText(replyToken, [`${textArray[randomNumb]}`,])
        // return client.getProfile(source.userId)
        //     .then((profile) => replyText(
        //         replyToken, [`${textArray[randomNumb]}`,]
        //     ));

        // default:
        //     console.log(`Echo message to ${replyToken}: ${message.text}`);
        //     return replyText(replyToken, message.text);
    }
}

function handleImage(message, replyToken) {
    let getContent;
    if (message.contentProvider.type === "line") {
        const downloadPath = path.join(__dirname, 'downloaded', `${message.id}.jpg`);
        const previewPath = path.join(__dirname, 'downloaded', `${message.id}-preview.jpg`);

        getContent = downloadContent(message.id, downloadPath)
            .then((downloadPath) => {
                // ImageMagick is needed here to run 'convert'
                // Please consider about security and performance by yourself
                cp.execSync(`convert -resize 240x jpeg:${downloadPath} jpeg:${previewPath}`);

                return {
                    originalContentUrl: baseURL + '/downloaded/' + path.basename(downloadPath),
                    previewImageUrl: baseURL + '/downloaded/' + path.basename(previewPath),
                };
            });
    } else if (message.contentProvider.type === "external") {
        getContent = Promise.resolve(message.contentProvider);
    }

    return getContent
        .then(({ originalContentUrl, previewImageUrl }) => {
            return client.replyMessage(
                replyToken,
                {
                    type: 'image',
                    originalContentUrl,
                    previewImageUrl,
                }
            );
        });
}

function handleVideo(message, replyToken) {
    let getContent;
    if (message.contentProvider.type === "line") {
        const downloadPath = path.join(__dirname, 'downloaded', `${message.id}.mp4`);
        const previewPath = path.join(__dirname, 'downloaded', `${message.id}-preview.jpg`);

        getContent = downloadContent(message.id, downloadPath)
            .then((downloadPath) => {
                // FFmpeg and ImageMagick is needed here to run 'convert'
                // Please consider about security and performance by yourself
                cp.execSync(`convert mp4:${downloadPath}[0] jpeg:${previewPath}`);

                return {
                    originalContentUrl: baseURL + '/downloaded/' + path.basename(downloadPath),
                    previewImageUrl: baseURL + '/downloaded/' + path.basename(previewPath),
                }
            });
    } else if (message.contentProvider.type === "external") {
        getContent = Promise.resolve(message.contentProvider);
    }

    return getContent
        .then(({ originalContentUrl, previewImageUrl }) => {
            return client.replyMessage(
                replyToken,
                {
                    type: 'video',
                    originalContentUrl,
                    previewImageUrl,
                }
            );
        });
}

function handleAudio(message, replyToken) {
    let getContent;
    if (message.contentProvider.type === "line") {
        const downloadPath = path.join(__dirname, 'downloaded', `${message.id}.m4a`);

        getContent = downloadContent(message.id, downloadPath)
            .then((downloadPath) => {
                return {
                    originalContentUrl: baseURL + '/downloaded/' + path.basename(downloadPath),
                };
            });
    } else {
        getContent = Promise.resolve(message.contentProvider);
    }

    return getContent
        .then(({ originalContentUrl }) => {
            return client.replyMessage(
                replyToken,
                {
                    type: 'audio',
                    originalContentUrl,
                    duration: message.duration,
                }
            );
        });
}

function downloadContent(messageId, downloadPath) {
    return client.getMessageContent(messageId)
        .then((stream) => new Promise((resolve, reject) => {
            const writable = fs.createWriteStream(downloadPath);
            stream.pipe(writable);
            stream.on('end', () => resolve(downloadPath));
            stream.on('error', reject);
        }));
}

function handleLocation(message, replyToken) {
    return client.replyMessage(
        replyToken,
        {
            type: 'location',
            title: message.title,
            address: message.address,
            latitude: message.latitude,
            longitude: message.longitude,
        }
    );
}

function handleSticker(message, replyToken) {
    return client.replyMessage(
        replyToken,
        {
            type: 'sticker',
            packageId: message.packageId,
            stickerId: message.stickerId,
        }
    );
}

// listen on port
module.exports = app;
//https://medium.com/linedevth/%E0%B8%AA%E0%B8%A3%E0%B9%89%E0%B8%B2%E0%B8%87-line-bot-%E0%B8%94%E0%B9%89%E0%B8%A7%E0%B8%A2-messaging-api-%E0%B9%81%E0%B8%A5%E0%B8%B0-cloud-functions-for-firebase-20d284edea1b