const {Client} = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const fs = require('fs');
const {phoneNumberFormat} = require('./helpers/formater');
const http = require('http');
const qrqode = require('qrcode');
const {on} = require('process');
const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({extended: true}));

const SESSION_FILE_PATH = './whatsapp-session.json';
let sessionCfg;
if (fs.existsSync(SESSION_FILE_PATH)) {
  sessionCfg = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
  res.sendFile('index.html', {root: __dirname});
});

const createSession = function (id, description, io) {
  const SESSION_FILE_PATH = `./whatsapp-session-${id}.json`;
  let sessionCfg;
  if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionCfg = require(SESSION_FILE_PATH);
  }
  const client = new Client({
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
      ],
    },
    session: sessionCfg,
  });

  client.initialize();
  client.on('qr', (qr) => {
    console.log(qr);
    qrqode.toDataURL(qr, (err, url) => {
      io.emit('qr', {id: id, src: url});
      io.emit('message', {id: id, text: 'Qr COde di Terima Silahkan Scand'});
    });
  });

  client.on('ready', () => {
    io.emit('ready', {id: id});
    io.emit('message', {id: id, text: 'Whats App is Ready'});
  });

  client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    io.emit('authenticated', {id: id});
    io.emit('message', {id: id, text: 'Wa Is authenticated'});
    sessionCfg = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
      if (err) {
        console.error(err);
      }
    });
  });

  client.on('auth_failure', function (session) {
    io.emit('message', {id: id, text: 'Auth Failur, restartting ..'});
  });

  client.on('disconnected', (reason) => {
    io.emit('message', {id: id, text: 'Whats App is Disconected'});
    fs.unlinkSync(SESSION_FILE_PATH, function (err) {
      if (err) return console.error(err);

      console.log('session Deleted');
    });
    client.destroy();
    client.initialize();
  });
};

// Socker io

io.on('connection', function (socket) {
  socket.on('created-session', function (data) {
    console.log('created session', data);
    // console.log(data);
    createSession(data.id, data.description, io);
  });
});

// io.on('connection', function (socket) {
//   socket.emit('message', 'connection');

//   client.on('qr', (qr) => {
//     qrqode.toDataURL(qr, (err, url) => {
//       socket.emit('qr', url);
//       socket.emit('message', 'Qr COde di Terima Silahkan Scand');
//     });
//   });

//   client.on('ready', () => {
//     socket.emit('ready', 'Wa Is Ready');
//     socket.emit('message', 'Wa Is Ready');
//   });

//   client.on('authenticated', (session) => {
//     console.log('AUTHENTICATED', session);
//     socket.emit('authenticated', 'Wa Is authenticated');
//     socket.emit('message', 'Wa Is authenticated');

//     sessionCfg = session;
//     fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
//       if (err) {
//         console.error(err);
//       }
//     });
//   });
// });

app.post('/send-message', (req, res) => {
  const number = phoneNumberFormat(req.body.number);
  const message = req.body.message;

  client
    .sendMessage(number, message)
    .then((response) => {
      res.status(200).json({status: true, response: response});
    })
    .catch((err) => {
      res.status(500).json({status: false, response: err});
    });
});

//

server.listen(port, function () {
  console.log('app running on');
});
