const express = require('express')
const session = require('express-session')
const app = express()
const fs = require('fs')
const https = require('https')
const bodyParser = require('body-parser')
const config = require('./config.json')
const database = require('./db.json')
const path = require('path')
const runCommand = require('./lib/runCommand.js')

const port = 8080

const saveDb = () => {
  fs.writeFileSync(path.join(__dirname, 'db.json'), JSON.stringify(database, null, 4))
}

app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

app.use(express.static(path.join(__dirname, 'public')))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(session({ secret: '12d9i239di23dnjUH1K' }))

app.all('/', (req, res) => {
  res.render('index', { database })
})

const auth = (path, func, fail) => {
  app.all(path, (req, res) => {
    const authx = req.headers.authorization
    if (!authx) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
      res.statusCode = 401
      res.end('<html><body>Need some creds son</body></html>')
    } else if (authx) {
      const tmp = authx.split(' ')
      const buf = new Buffer(tmp[1], 'base64')
      const plainAuth = buf.toString()
      const creds = plainAuth.split(':')
      const username = creds[0]
      const password = creds[1]
      if (username === config.panel.login && password === config.panel.password) {
        res.statusCode = 200
        func(req, res)
      } else {
        res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"')
        res.statusCode = 403
        if (fail === undefined) {
          res.end('<script>document.location="/"</script>')
        } else {
          fail(req, res)
        }
      }
    }
  })
}

auth('/panel', (req, res) => {
  if (req.query.temp === 'logout') {
    res.removeHeader('authorization')
    res.end('LUL')
  } else {
    res.render('panel/index', {
      database,
      query: req.query,
      config
    })
  }
})

auth('/panel/api/add_voucher', (req, res) => {
  let code
  if (req.query.code === '') {
    code = Math.random()
      .toString(36)
      .replace('0.', 'grok_' || '')
  } else {
    code = req.query.code
  }
  database.vouchers[code] = {
    title: req.query.title,
    commands: req.query.commands,
    server: req.query.server
  }
  saveDb()
  res.send('OK')
})

auth('/panel/api/del_voucher', (req, res) => {
  delete database.vouchers[req.query.code]
  saveDb()
  res.send('OK')
})

auth('/panel/api/set_server', (req, res) => {
  if (req.query.del) {
    database.servers[req.query.uuid] = {}
    delete database.servers[req.query.uuid]
  } else {
    database.servers[req.query.uuid] = {
      name: req.query.name,
      ip: req.query.ip,
      rcon: {
        port: req.query.rcon_port,
        password: req.query.rcon_pwd
      }
    }
  }
  saveDb()
  res.send('OK')
})

auth('/panel/api/new_server', (req, res) => {
  const servName = Math.random()
    .toString(36)
    .replace('0.', 'serv_' || '')
  database.servers[servName] = {
    name: 'A Minecraft server',
    ip: 'localhost',
    rcon: {
      port: '25575',
      password: 'password'
    }
  }
  saveDb()
  res.send(
        `<script>document.location='/panel/?temp=server&server=${servName}'</script>`
  )
})

auth('/panel/api/set_service', (req, res) => {
  if (req.query.del) {
    database.services[req.query.uuid] = {}
    delete database.services[req.query.uuid]
  } else {
    database.services[req.query.uuid] = {
      title: req.query.name,
      description: req.query.description,
      commands: req.query.commands,
      icon: req.query.icon,
      server: req.query.server,
      payments: {
        SMS: {
          active: req.query.SMS.active,
          userid: req.query.SMS.userid,
          serviceid: req.query.SMS.serviceid,
          sms: req.query.SMS.sms,
          number: req.query.SMS.number,
          costnetto: req.query.SMS.cost,
          cost: req.query.SMS.costb
        },
        przelew: {
          active: req.query.przelew.active,
          userid: req.query.przelew.userid,
          shopid: req.query.przelew.shopid,
          hash: req.query.przelew.hash,
          cost: req.query.przelew.cost,
          signature: req.query.przelew.signature
        },
        PSC: {
          active: req.query.PSC.active,
          cost: req.query.PSC.cost
        }
      }
    }
  }
  res.send('OK')
  saveDb()
})

auth('/panel/api/new_service', (req, res) => {
  const servName = Math.random()
    .toString(36)
    .replace('0.', 's_' || '')
  database.services[servName] = {
    title: '',
    description: '',
    commands: '',
    icon: '',
    server: '',
    payments: {
      SMS: {
        active: 'false',
        userid: '',
        serviceid: '',
        sms: '',
        number: '',
        costnetto: '',
        cost: ''
      },
      przelew: {
        active: 'false',
        userid: '',
        shopid: '',
        hash: '',
        cost: '',
        signature: ''
      },
      PSC: {
        active: 'false',
        cost: ''
      }
    }
  }
  res.send(
        `<script>document.location='/panel/?temp=service&service=${servName}'</script>`
  )
  saveDb()
})

app.all('/shop/', (req, res) => {
  res.render('shop/index', {
    database,
    query: req.query,
    config
  })
})

app.all('/shop/buy/SMS/', (req, res) => {
  console.log('Recieved SMS request', req.query)
  const sms = database.services[req.query.service].payments.SMS
  const pregMatchAll = (regex, str) => {
    return new RegExp(regex, 'g').test(str)
  }
  if (!pregMatchAll(/^[A-Za-z0-9]{8}$/, req.query.code)) {
    res.send('ERR_F')
  } else {
    https.get(
      `https://microsms.pl/api/check.php?userid=${sms.userid}&number=${sms.number}&code=${req.query.code}&serviceid=${sms.serviceid}`,
      function (resp) {
        let data
        data = ''
        resp.on('data', (chunk) => {
          data += chunk
        })
        resp.on('end', function () {
          const xd = data.split(',')
          if (xd[0] === 'E') {
            res.send('ERR_X')
          } else if (xd[0] === '1') {
            res.send('OK')
            runCommand(
              database.services[req.query.service].commands
            )
          } else {
            res.send('ERR_N')
          }
        })
      }
    )
  }
})

app.post('/shop/buy/przelew/', (req, res) => {
  console.log('RECIEVED PRZELEW DATA!')
  res.send('OK')
})

// app.all("/shop/buy/PSC/", function (req, res) {});

app.post('/shop/voucher/', (req, res) => {
  if (database.vouchers[String(req.body.code)] !== undefined) {
    res.send(database.vouchers[String(req.body.code)].title)
  } else {
    res.send('NO')
  }
})

app.listen(port, () => {
  console.log(`Serwer działa na \x1b[34m*:${port}\x1b[0m`)
})
