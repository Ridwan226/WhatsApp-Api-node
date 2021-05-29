const {Client, MessageMedia} = require('whatsapp-web.js');
const express = require('express');
const socketIO = require('socket.io');
const {body, validationResult} = require('express-validator');
const fs = require('fs');
const {phoneNumberFormat} = require('./helpers/formater');
const http = require('http');
const qrqode = require('qrcode');
const cors = require('cors');
const router = express.Router();
const axios = require('axios');

const port = process.env.PORT || 8000;

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {cors: {origin: '*'}});

app.use(cors());
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({extended: true}));

// const SESSION_FILE_PATH = './whatsapp-session.json';
// let sessionCfg;
// if (fs.existsSync(SESSION_FILE_PATH)) {
//   sessionCfg = require(SESSION_FILE_PATH);
// }
const db = require('./helpers/db');

(async () => {
  app.get('/', (req, res) => {
    res.sendFile('index.html', {root: __dirname});
  });

  const savedSession = await db.readSession();

  app.get('/logout', (req, res) => {
    // fs.unlinkSync(SESSION_FILE_PATH, function (err) {
    //   if (err) return console.error(err);

    //   console.log('session Deleted');
    // });
    db.removeSession();

    client.destroy();
    client.initialize();

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
    session: savedSession,
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

      // sessionCfg = session;
      // fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
      //   if (err) {
      //     console.error(err);
      //   }
      // });

      //Save DbSession
      db.saveSession(session);
    });

    client.on('auth_failure', function (session) {
      io.emit('message', 'Auth Failur, restartting ..');
      console.log('Auth Failur, restartting ..');
      db.removeSession();

      client.destroy();
      client.initialize();
    });

    client.on('disconnected', (reason) => {
      socket.emit('message', 'Whatsapp is disconnected!');
      // fs.unlinkSync(SESSION_FILE_PATH, function (err) {
      //   if (err) return console.log(err);
      //   console.log('Session file deleted!');
      // });

      // Remove Session
      db.removeSession();

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

  app.post('/send-media', async (req, res) => {
    const number = phoneNumberFormat(req.body.number);
    const caption = req.body.caption;
    const fileUrl = req.body.file_url;

    const isRegisterdNumber = await cekRegistrasiNumber(number);

    if (!isRegisterdNumber) {
      return res
        .status(442)
        .json({status: false, message: 'Number Not Registered'});
    }

    let mimetype;
    const atacment = await axios
      .get(fileUrl, {responseType: 'arraybuffer'})
      .then((response) => {
        mimetype = response.headers['content-type'];
        return response.data.toString('base64');
      })
      .catch((err) => {
        res.status(400).json({status: false, response: 'Format Image Fail'});
      });

    const media = new MessageMedia(mimetype, atacment, 'Media');

    client
      .sendMessage(number, media, {caption: caption})
      .then((response) => {
        res.status(200).json({status: true, response: response});
      })
      .catch((err) => {
        res.status(500).json({status: false, response: err});
      });
  });

  app.get('/send-refresh', (req, res) => {
    res.json({status: true, response: 'Success Refresh'});
  });

  //

  server.listen(port, function () {
    console.log('app running on');
  });
})();
