
express = require "express"
app = express()
fs = require "fs"
opn = require "opn"
https = require "https"
Rcon = require "rcon"
bodyParser = require "body-parser"

app.use bodyParser.urlencoded { extended: true }

port=8080

runCommand=(frase)->
	try
		conn = new Rcon config.server, config.rcon.port, config.rcon.password
		sleep = (ms) ->
			new Promise (res) ->
				setTimeout res, ms
				return
		conn.connect()
		console.log "Waiting 1 sec..."
		await sleep 500
		conn.send frase
		console.log 'Waiting 1 sec...'
		await sleep 1000
		conn.disconnect()
		return
	return
saveDb=()->
	fs.writeFileSync "#{__dirname}/db.json", JSON.stringify(database,null,4)
	return
config={}
rcon=null
fs.readFile "#{__dirname}/config/config.json", "utf8", (err, data) ->
	config=JSON.parse data
	return
rules={}
fs.readFile "#{__dirname}/config/rules_discord.txt", "utf8", (err, data)->
	rules.discord=data.replace /\n/gi,"<br>"
	return
fs.readFile "#{__dirname}/config/rules_main.txt", "utf8", (err, data) ->
	rules.main=data.replace /\n/gi,"<br>"
	return
fs.readFile "#{__dirname}/config/rules_server.txt", "utf8", (err, data) ->
	rules.server=data.replace /\n/gi,"<br>"
	return
fs.readFile "#{__dirname}/config/rules_shop.txt", "utf8", (err, data) ->
	rules.shop=data.replace /\n/gi,"<br>"
	return
database={}
fs.readFile "#{__dirname}/db.json", "utf8", (err, data) ->
	database=JSON.parse data
	return

app.set 'view engine', 'ejs'
app.set 'views', "#{__dirname}/views"
app.use express.static("#{__dirname}/public")

app.all '/', (req, res)->
	res.render 'index',{rules,database}
	return
auth=(path,func,fail)->
	app.all path, (req,res)->
		authx = req.headers["authorization"]
		if not authx
			res.setHeader 'WWW-Authenticate', 'Basic realm="Secure Area"'
			res.statusCode = 401
			res.end '<html><body>Need some creds son</body></html>'
		else if authx
			tmp = authx.split ' '
			buf = new Buffer tmp[1], 'base64'
			plain_auth = buf.toString()
			creds = plain_auth.split ':'
			username = creds[0]
			password = creds[1]
			if (username is config.panel.login) and (password is config.panel.password)
				res.statusCode = 200
				func req,res
			else
				res.setHeader 'WWW-Authenticate', 'Basic realm="Secure Area"'
				res.statusCode = 403
				if fail is undefined
					res.end '<script>document.location="/"</script>'
				else
					fail req,res
		return
	return
auth "/panel", (req,res)->
	if req.query.temp is "logout"
		res.removeHeader "authorization"
		res.end res.headers["authorization"]
	else
		res.render 'panel/index', {
			database
			query:req.query
			config
		}
	return
auth '/panel/api/add_voucher',(req,res)->
	if req.query.code is ""
		code=Math.random().toString(36).replace('0.',"grok_" or '')
	else
		code=req.query.code
	database.vouchers[code]={
		title:req.query.title
		commands:req.query.commands
		server:req.query.server
	}
	saveDb()
	res.send "OK"
	return
auth '/panel/api/del_voucher',(req,res)->
	delete database.vouchers[req.query.code]
	saveDb()
	res.send "OK"
	return
auth '/panel/api/set_server',(req,res)->
	if req.query.del
		database.servers[req.query.uuid]={}
		delete database.servers[req.query.uuid]
	else
		database.servers[req.query.uuid]={
			name:req.query.name
			ip:req.query.ip
			rcon:{
				port:req.query.rcon_port
				password:req.query.rcon_pwd
			}
		}
	saveDb()
	res.send "OK"
	return
auth '/panel/api/new_server',(req,res)->
	servName=Math.random().toString(36).replace '0.',"serv_" or ''
	database.servers[servName]={
		name:"A Minecraft server"
		ip:"localhost"
		rcon:{
			port:"25575"
			password:"password"
		}
	}
	saveDb()
	res.send("<script>document.location='/panel/?temp=server&server=#{servName}'</script>")
	return
auth '/panel/api/set_service',(req,res)->
	if req.query.del
		database.services[req.query.uuid]={}
		delete database.services[req.query.uuid]
	else
		database.services[req.query.uuid]={
			title:req.query.name
			description:req.query.description
			commands:req.query.commands
			icon:req.query.icon
			server:req.query.server
			payments:{
				SMS:{
					active:req.query.SMS.active
					userid:req.query.SMS.userid
					serviceid: req.query.SMS.serviceid
					sms:req.query.SMS.sms
					number:req.query.SMS.number
					costnetto: req.query.SMS.cost
					cost:req.query.SMS.costb
				}
				przelew:{
					active:req.query.przelew.active
					userid:req.query.przelew.userid
					shopid:req.query.przelew.shopid
					hash:req.query.przelew.hash
					cost:req.query.przelew.cost
					signature: req.query.przelew.signature
				}
				PSC:{
					active:req.query.PSC.active
					cost:req.query.PSC.cost
				}
			}
		}
	res.send "OK"
	saveDb()
	return
auth "/panel/api/new_service",(req,res)->
	servName=Math.random().toString(36).replace '0.',"s_" or ''
	database.services[servName]={
		title:""
		description:""
		commands:""
		icon:""
		server:""
		payments:{
			SMS:{
				active:"false"
				userid:""
				serviceid:""
				sms:""
				number:""
				costnetto:""
				cost:""
			}
			przelew:{
				active:"false"
				userid:""
				shopid:""
				hash:""
				cost:""
				signature:""
			}
			PSC:{
				active:"false"
				cost:""
			}
		}
	}
	res.send "<script>document.location='/panel/?temp=service&service=#{servName}'</script>"
	saveDb()
	return
app.all "/shop/",(req, res)->
	res.render "shop/index", {
		database
		query:req.query
		config
	}
	return
preg_match_all=(regex, str)->
  return new RegExp(regex,'g').test str
app.all "/shop/buy/SMS/",(req,res)->
	console.log "Recieved SMS request",req.query
	sms=database.services[req.query.service].payments.SMS
	if not preg_match_all(/^[A-Za-z0-9]{8}$/,req.query.code)
		res.send "ERR_F"
	else
		https.get "https://microsms.pl/api/check.php?userid=#{sms.userid}&number=#{sms.number}&code=#{req.query.code}&serviceid=#{sms.serviceid}",(resp)->
			data = ''
			resp.on "data",(chunk)->
				data += chunk
				return
			resp.on "end", ()->
				xd=data.split ","
				if xd[0] is "E"
					res.send "ERR_X"
				else if xd[0] is "1"
					res.send "OK"
					runCommand database.services[req.query.service].commands
				else
					res.send "ERR_N"
				return
			return
	return
app.post "/shop/buy/przelew/",(req,res)->
	console.log "RECIEVED PRZELEW DATA!"
	res.send "OK"
	return
app.all '/shop/buy/PSC/',(req,res)->
	return
app.post '/shop/voucher/',(req,res)->
	if database.vouchers[String(req.body.code)] isnt undefined
		res.send database.vouchers[String(req.body.code)].title
	else
		res.send "NO"
	return
app.listen port,()->
	console.log "App listening at \x1b[34m*:#{port}"
	return
