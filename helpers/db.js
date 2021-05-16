const {Client} = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

client.connect();

const readSession = async () => {
  try {
    const res = await client.query(
      'SELECT * FROM wa_sessions ORDER BY created_at DESC LIMIT 1',
    );
    if (res.rows.length) {
      console.log('res row', res.rows[0].session);
      return res.rows[0].session;
    }
    return '';
  } catch (err) {
    console.log('err row', err);
    throw err;
  }
};

const saveSession = (session) => {
  client.query(
    'INSERT INTO wa_sessions (session) VALUES($1)',
    [session],
    (err, res) => {
      if (err) {
        console.log('Fail Save Session Error', err);
      } else {
        console.log('session Save');
      }
    },
  );
};

const removeSession = () => {
  client.query('DELETE FROM wa_sessions', (err, res) => {
    if (err) {
      console.log('Fail Remover Session Error', err);
    } else {
      console.log('session Remover');
    }
  });
};

module.exports = {
  readSession,
  saveSession,
  removeSession,
};
