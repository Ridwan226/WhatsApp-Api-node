const {Client} = require('pg');
// connectionString: process.env.DATABASE_URL,

const client = new Client({
  connectionString:
    'postgres://tjkyuiiiirxjdi:650dcf1a8e511ea500510b0b38e2eae58601d5c91d9340f1c77f22e876bde5f1@ec2-54-157-100-65.compute-1.amazonaws.com:5432/d14sifmb06c0u7',
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
