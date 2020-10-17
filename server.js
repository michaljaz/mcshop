// server.js
var express = require('express');
var app = express();
var fs = require('fs');
const opn = require('opn');
const https = require('https');
var Rcon = require('rcon');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: true }));

async function runCommand(frase){
	try{
		var conn = new Rcon(config.server, config.rcon.port, config.rcon.password);
		  const sleep = ms => new Promise(res => setTimeout(res, ms));
		  conn.connect();
		  console.log('Waiting 1 sec...');
		  await sleep(500);
		  conn.send(frase);
		  console.log('Waiting 1 sec...');
		  await sleep(1000);
		  conn.disconnect();
		  return;
	}catch(e){}
}
function saveDb(){
	fs.writeFileSync('./db.json', JSON.stringify(database,null,4));
}


//Load files
	var config={}
	var rcon;
	fs.readFile('./config/config.json', 'utf8', (err, data) => {
	    config=JSON.parse(data)  
	})

	var rules={}
	fs.readFile('./config/rules_discord.txt', 'utf8', (err, data) => {
	    rules.discord=data.replace(/\n/gi,'<br>')
	})
	fs.readFile('./config/rules_main.txt', 'utf8', (err, data) => {
	    rules.main=data.replace(/\n/gi,"<br>")
	})
	fs.readFile('./config/rules_server.txt', 'utf8', (err, data) => {
	    rules.server=data.replace(/\n/gi,"<br>")
	})
	fs.readFile('./config/rules_shop.txt', 'utf8', (err, data) => {
	    rules.shop=data.replace(/\n/gi,"<br>")
	})

	var database={}
	fs.readFile('./db.json', 'utf8', (err, data) => {
	    database=JSON.parse(data)
	})


// set the view engine to ejs
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

// index page 
app.all('/', function(req, res) {
    res.render('index',{rules,database});
});

app.all('/panel/', function(req, res) {
	var auth = req.headers['authorization'];
	if(!auth){
		res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
		res.statusCode = 401;
		res.end('<html><body>Need some creds son</body></html>');
	}else if(auth){
		var tmp = auth.split(' ');
        var buf = new Buffer(tmp[1], 'base64'); 
        var plain_auth = buf.toString();
        var creds = plain_auth.split(':');
        var username = creds[0];
        var password = creds[1];
        if((username == config.panel.login) && (password == config.panel.password)) { 
            res.statusCode = 200;
            res.render('panel/index', {
		        database,
		        query:req.query,
		        config
		    }); 
        }else {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="Secure Area"');
            res.statusCode = 403;
            res.end('<script>document.location="/"</script>');
        }
	}
});
app.all('/panel/api/add_voucher',function (req,res){
	var code
	if(req.query.code==""){
		code=Math.random().toString(36).replace('0.',"grok_" || '');
	}else{
		code=req.query.code
	}
	database.vouchers[code]={
		title:req.query.title,
        commands:req.query.commands,
        server:req.query.server
	}
	saveDb()
	res.send("OK")
})
app.all('/panel/api/del_voucher',function (req,res){
	delete database.vouchers[req.query.code]
	saveDb()
	res.send("OK")
})
app.all('/panel/api/set_server',function (req,res){
	if(req.query.del){
		database.servers[req.query.uuid]={}
		delete database.servers[req.query.uuid]
	}else{
		database.servers[req.query.uuid]={
			name:req.query.name,
			ip:req.query.ip,
			rcon:{
				port:req.query.rcon_port,
				password:req.query.rcon_pwd
			}
		}
	}
	saveDb()
	res.send(`OK`)
})
app.all('/panel/api/new_server',function (req,res){
	var servName=Math.random().toString(36).replace('0.',"serv_" || '');
	database.servers[servName]={
		name:"A Minecraft server",
		ip:"localhost",
		rcon:{
			port:"25575",
			password:"password"
		}
	}
	saveDb()
	res.send(`<script>document.location='/panel/?temp=server&server=${servName}'</script>`)
})
app.all('/panel/api/set_service',function (req,res){
	if(req.query.del){
		database.services[req.query.uuid]={}
		delete database.services[req.query.uuid]
	}else{
		database.services[req.query.uuid]={
			title:req.query.name,
			description:req.query.description,
			commands:req.query.commands,
			icon:req.query.icon,
			server:req.query.server,
			payments:{
				SMS:{
					active:req.query.SMS.active,
					userid:req.query.SMS.userid,
	                serviceid: req.query.SMS.serviceid,
	                sms:req.query.SMS.sms,
	                number:req.query.SMS.number,
	                costnetto: req.query.SMS.cost,
	                cost:req.query.SMS.costb
				},
				przelew:{
					active:req.query.przelew.active,
	                userid:req.query.przelew.userid,
	                shopid:req.query.przelew.shopid,
	                hash:req.query.przelew.hash,
	                cost:req.query.przelew.cost,
	                signature: req.query.przelew.signature
				},
				PSC:{
					active:req.query.PSC.active,
					cost:req.query.PSC.cost
				}
			}
		}
	}
	
	res.send(`OK`)
	saveDb()
})
app.all('/panel/api/new_service',function (req,res){
	var servName=Math.random().toString(36).replace('0.',"s_" || '');
	database.services[servName]={
		title:"",
		description:"",
		commands:"",
		icon:"",
		server:"",
		payments:{
			SMS:{
				active:"false",
				userid:"",
                serviceid:"",
                sms:"",
                number:"",
                costnetto:"",
                cost:""
			},
			przelew:{
				active:"false",
                userid:"",
                shopid:"",
                hash:"",
                cost:"",
                signature:""
			},
			PSC:{
				active:"false",
				cost:""
			}
		}
	}
	res.send(`<script>document.location='/panel/?temp=service&service=${servName}'</script>`)
	saveDb()
})
app.all('/shop/', function(req, res) {
	
	res.render('shop/index', {
        database,
        query:req.query,
        config
    }); 
	
});
function preg_match_all(regex, str) {
  return new RegExp(regex,'g').test(str)
}
app.all('/shop/buy/SMS/',function (req,res){
	console.log("Recieved SMS request",req.query)
	var sms=database.services[req.query.service].payments.SMS
	if(!preg_match_all(/^[A-Za-z0-9]{8}$/,req.query.code)){
		res.send("ERR_F")
	}else{
		https.get(`https://microsms.pl/api/check.php?userid=${sms.userid}&number=${sms.number}&code=${req.query.code}&serviceid=${sms.serviceid}`, (resp) => {
		  let data = '';
		  resp.on('data', (chunk) => {
		    data += chunk;
		  });
		  resp.on('end', () => {
		  	xd=data.split(",")
		  	if(xd[0]=="E"){
		  		res.send("ERR_X")
		  	}else if(xd[0]=="1"){
		  		res.send("OK")
		  		runCommand(database.services[req.query.service].commands)
		  	}else{
		  		res.send("ERR_N")
		  	}
		  });
		})
	}
})
app.post('/shop/buy/przelew/',function (req,res){
	console.log("RECIEVED PRZELEW DATA!")
	res.send("OK")
})
app.all('/shop/buy/PSC/',function (req,res){

})

app.post('/shop/voucher/',function (req,res){
	if(database.vouchers[String(req.body.code)]!=undefined){
		res.send(database.vouchers[String(req.body.code)].title)
	}else{
		res.send("NO")
	}
	
})

app.listen(8080,()=>{
	console.log('8080 is the magic port');
	opn("http://localhost:8080/")
});
