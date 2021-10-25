const http = require('http')
const ngrok = require('ngrok');
const app = require('./app')
const server = http.createServer(app)

const HOST = process.env.HOST || "127.0.0.1";
const PORT = process.env.PORT || 5000;
let BASE_URL = process.env.CHANNEL_BASE_URL||'';
// server.listen(PORT, () =>
//   console.log(`AIRI ${HOST} is running on port ${PORT}`)
// );
server.listen(PORT, () => {
  if (BASE_URL) {
    console.log(`listening on ${BASE_URL}:${PORT}/callback`);
  } else {
    console.log("It seems that BASE_URL is not set. Connecting to ngrok...")
    ngrok.connect(PORT).then(url => {
      BASE_URL = url;
      console.log(`listening on ${BASE_URL}/callback`);
    }).catch(console.error);
  }
});

//https://dev.to/adebayoileri/configure-babel-for-nodejs-application-3798