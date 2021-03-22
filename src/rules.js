const fs = require('fs')
const path = require('path')
const br = function (str) {
  return str.replace(/\n/gi, '<br>')
}
module.exports = {
  discord: br(fs.readFileSync(path.join(__dirname, 'rules/discord.txt'), 'utf-8')),
  main: br(fs.readFileSync(path.join(__dirname, 'rules/main.txt'), 'utf-8')),
  server: br(fs.readFileSync(path.join(__dirname, 'rules/server.txt'), 'utf-8')),
  shop: br(fs.readFileSync(path.join(__dirname, 'rules/shop.txt'), 'utf-8'))
}
