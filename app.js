const {Client} = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const {body, validationResult} = require('express-validator');
const fs = require('fs');
const {phoneNumberFormat} = require('./helpers/formater');
const http = require('http');
const qrqode = require('qrcode');
const cors = require('cors');
const router = express.Router();

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {cors: {origin: '*'}});

app.use(cors());
app.options('*', cors());

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

app.get('/logout', (req, res) => {
  client.logout();
  client.destroy();
  client.initialize();
  fs.unlinkSync(SESSION_FILE_PATH, function (err) {
    if (err) return console.error(err);

    console.log('session Deleted');
  });

  res.json({status: true, response: 'Success Logout'});
});

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

// client.on('ready', () => {
//   console.log('Client is ready!');
// });

client.on('message', (msg) => {
  if (msg.body == '!ping') {
    msg.reply('pong');
  } else if (msg.body == 'good morning') {
    msg.reply('pagi alay');
  }
});

client.initialize();

// Socker io

io.on('connection', function (socket) {
  socket.emit('message', 'connection');

  client.on('qr', (qr) => {
    qrqode.toDataURL(qr, (err, url) => {
      socket.emit('qr', url);
      socket.emit('message', 'Qr COde di Terima Silahkan Scand');
    });
  });

  client.on('ready', () => {
    console.log('ready bgt');
    socket.emit('ready', 'Wa Is Ready');
    socket.emit('message', 'Wa Is Ready');
  });

  client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    socket.emit('authenticated', 'Wa Is authenticated');
    socket.emit('message', 'Wa Is authenticated');

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
    socket.emit('message', 'Whatsapp is disconnected!');
    fs.unlinkSync(SESSION_FILE_PATH, function (err) {
      if (err) return console.log(err);
      console.log('Session file deleted!');
    });
    client.destroy();
    client.initialize();
  });
});

const cekRegistrasiNumber = async function (number) {
  const isRegisterd = await client.isRegisteredUser(number);
  return isRegisterd;
};

app.post(
  '/send-message',
  [body('number').notEmpty(), body('message').notEmpty()],
  async (req, res) => {
    const error = validationResult(req).formatWith(({msg}) => {
      return msg;
    });

    if (!error.isEmpty()) {
      return res.status(422).json({
        status: false,
        message: error.mapped(),
      });
    }

    const number = phoneNumberFormat(req.body.number);

    const isRegisterdNumber = await cekRegistrasiNumber(number);

    if (!isRegisterdNumber) {
      return res
        .status(442)
        .json({status: false, message: 'Number Not Registered'});
    }

    const message = req.body.message;

    client
      .sendMessage(number, message)
      .then((response) => {
        res.status(200).json({status: true, response: response});
      })
      .catch((err) => {
        res.status(500).json({status: false, response: err});
      });
  },
);

//

server.listen(port, function () {
  console.log('app running on');
});
