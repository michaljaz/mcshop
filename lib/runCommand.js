const Rcon = require('rcon')
const config = require('../config.json')
const runCommand = async (frase) => {
  let conn, sleep
  try {
    conn = new Rcon(config.server, config.rcon.port, config.rcon.password)
    sleep = (ms) => {
      return new Promise((resolve) => {
        setTimeout(resolve, ms)
      })
    }
    conn.connect()
    console.log('Waiting 1 sec...')
    await sleep(500)
    conn.send(frase)
    console.log('Waiting 1 sec...')
    await sleep(1000)
    conn.disconnect()
  } catch (error) {}
}

module.exports = runCommand
