var express = require("express");
var app = express();
var fs = require("fs");
var https = require("https");
var Rcon = require("rcon");
var bodyParser = require("body-parser");
var config = require(`${__dirname}/config.json`);
var rules = require("./rules.js");
var database = require(`${__dirname}/db.json`);

app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);

var port = 8080;

var runCommand = async function (frase) {
    var conn, sleep;
    try {
        conn = new Rcon(config.server, config.rcon.port, config.rcon.password);
        sleep = function (ms) {
            return new Promise(function (res) {
                setTimeout(res, ms);
            });
        };
        conn.connect();
        console.log("Waiting 1 sec...");
        await sleep(500);
        conn.send(frase);
        console.log("Waiting 1 sec...");
        await sleep(1000);
        conn.disconnect();
        return;
    } catch (error) {}
};
var saveDb = function () {
    fs.writeFileSync(`${__dirname}/db.json`, JSON.stringify(database, null, 4));
};

app.set("view engine", "ejs");

app.set("views", `${__dirname}/views`);

app.use(express.static(`${__dirname}/public`));

app.all("/", function (req, res) {
    res.render("index", { rules, database });
});

var auth = function (path, func, fail) {
    app.all(path, function (req, res) {
        var authx, buf, creds, password, plain_auth, tmp, username;
        authx = req.headers["authorization"];
        if (!authx) {
            res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
            res.statusCode = 401;
            res.end("<html><body>Need some creds son</body></html>");
        } else if (authx) {
            tmp = authx.split(" ");
            buf = new Buffer(tmp[1], "base64");
            plain_auth = buf.toString();
            creds = plain_auth.split(":");
            username = creds[0];
            password = creds[1];
            if (
                username === config.panel.login &&
                password === config.panel.password
            ) {
                res.statusCode = 200;
                func(req, res);
            } else {
                res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
                res.statusCode = 403;
                if (fail === void 0) {
                    res.end('<script>document.location="/"</script>');
                } else {
                    fail(req, res);
                }
            }
        }
    });
};

auth("/panel", function (req, res) {
    if (req.query.temp === "logout") {
        res.removeHeader("authorization");
        res.end(res.headers["authorization"]);
    } else {
        res.render("panel/index", {
            database,
            query: req.query,
            config,
        });
    }
});

auth("/panel/api/add_voucher", function (req, res) {
    var code;
    if (req.query.code === "") {
        code = Math.random()
            .toString(36)
            .replace("0.", "grok_" || "");
    } else {
        code = req.query.code;
    }
    database.vouchers[code] = {
        title: req.query.title,
        commands: req.query.commands,
        server: req.query.server,
    };
    saveDb();
    res.send("OK");
});

auth("/panel/api/del_voucher", function (req, res) {
    delete database.vouchers[req.query.code];
    saveDb();
    res.send("OK");
});

auth("/panel/api/set_server", function (req, res) {
    if (req.query.del) {
        database.servers[req.query.uuid] = {};
        delete database.servers[req.query.uuid];
    } else {
        database.servers[req.query.uuid] = {
            name: req.query.name,
            ip: req.query.ip,
            rcon: {
                port: req.query.rcon_port,
                password: req.query.rcon_pwd,
            },
        };
    }
    saveDb();
    res.send("OK");
});

auth("/panel/api/new_server", function (req, res) {
    var servName;
    servName = Math.random()
        .toString(36)
        .replace("0.", "serv_" || "");
    database.servers[servName] = {
        name: "A Minecraft server",
        ip: "localhost",
        rcon: {
            port: "25575",
            password: "password",
        },
    };
    saveDb();
    res.send(
        `<script>document.location='/panel/?temp=server&server=${servName}'</script>`
    );
});

auth("/panel/api/set_service", function (req, res) {
    if (req.query.del) {
        database.services[req.query.uuid] = {};
        delete database.services[req.query.uuid];
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
                    cost: req.query.SMS.costb,
                },
                przelew: {
                    active: req.query.przelew.active,
                    userid: req.query.przelew.userid,
                    shopid: req.query.przelew.shopid,
                    hash: req.query.przelew.hash,
                    cost: req.query.przelew.cost,
                    signature: req.query.przelew.signature,
                },
                PSC: {
                    active: req.query.PSC.active,
                    cost: req.query.PSC.cost,
                },
            },
        };
    }
    res.send("OK");
    saveDb();
});

auth("/panel/api/new_service", function (req, res) {
    var servName;
    servName = Math.random()
        .toString(36)
        .replace("0.", "s_" || "");
    database.services[servName] = {
        title: "",
        description: "",
        commands: "",
        icon: "",
        server: "",
        payments: {
            SMS: {
                active: "false",
                userid: "",
                serviceid: "",
                sms: "",
                number: "",
                costnetto: "",
                cost: "",
            },
            przelew: {
                active: "false",
                userid: "",
                shopid: "",
                hash: "",
                cost: "",
                signature: "",
            },
            PSC: {
                active: "false",
                cost: "",
            },
        },
    };
    res.send(
        `<script>document.location='/panel/?temp=service&service=${servName}'</script>`
    );
    saveDb();
});

app.all("/shop/", function (req, res) {
    res.render("shop/index", {
        database,
        query: req.query,
        config,
    });
});

var preg_match_all = function (regex, str) {
    return new RegExp(regex, "g").test(str);
};

app.all("/shop/buy/SMS/", function (req, res) {
    var sms;
    console.log("Recieved SMS request", req.query);
    sms = database.services[req.query.service].payments.SMS;
    if (!preg_match_all(/^[A-Za-z0-9]{8}$/, req.query.code)) {
        res.send("ERR_F");
    } else {
        https.get(
            `https://microsms.pl/api/check.php?userid=${sms.userid}&number=${sms.number}&code=${req.query.code}&serviceid=${sms.serviceid}`,
            function (resp) {
                var data;
                data = "";
                resp.on("data", function (chunk) {
                    data += chunk;
                });
                resp.on("end", function () {
                    var xd;
                    xd = data.split(",");
                    if (xd[0] === "E") {
                        res.send("ERR_X");
                    } else if (xd[0] === "1") {
                        res.send("OK");
                        runCommand(
                            database.services[req.query.service].commands
                        );
                    } else {
                        res.send("ERR_N");
                    }
                });
            }
        );
    }
});

app.post("/shop/buy/przelew/", function (req, res) {
    console.log("RECIEVED PRZELEW DATA!");
    res.send("OK");
});

// app.all("/shop/buy/PSC/", function (req, res) {});

app.post("/shop/voucher/", function (req, res) {
    if (database.vouchers[String(req.body.code)] !== void 0) {
        res.send(database.vouchers[String(req.body.code)].title);
    } else {
        res.send("NO");
    }
});

app.listen(port, function () {
    console.log(`App listening at \x1b[34m*:${port}\x1b[0m`);
});
