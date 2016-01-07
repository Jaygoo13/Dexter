/**
 * Copyright (c) 2015 Samsung Electronics, Inc.,
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * * Redistributions of source code must retain the above copyright notice, this
 *   list of conditions and the following disclaimer.
 *
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
"use strict";

var express = require('express');
var http = require('http');
var path = require('path');
var log = require('./util/logging');
var server = require('./routes/server');
var util = require('./util/dexter-util');

var app = express();

initialize();

function initialize(){
    initExcutionMode();
    initConfigFromFile();
    loadCliOptions();
    configureApp();
    initModules();
    startServer();
}

function initConfigFromFile(){
    var fs = require('fs');
    var text = fs.readFileSync('./config.json', 'utf8');
    if(!text) {
        console.log("there is no %dexter-monitor-home%/config.json file.");
        process.exit(-1);
    }

    global.config = JSON.parse(text);
    global.config.ip = util.getLocalIPAddress();
}

function initExcutionMode(){
    if(!process.env.NODE_ENV){
        process.env.NODE_ENV = 'production';
    } else {
        process.env.NODE_ENV = 'development';
    }
}

function loadCliOptions(){
    var cliOptions = util.getCliOptions();
    global.config.port = cliOptions.getValue("p", 4981);
}

function configureApp(){
    app.configure(function(){
        app.use(allowCORS);
    });

    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'jade');
    app.use(express.favicon());
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));

    if ('development' === app.get('env')) {
        app.use(express.errorHandler());
    }

    initErrorLog();
    setWebApis()
}

function allowCORS(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');

    if ('OPTIONS' === req.method) {
        res.send(200);
    }

    next();
}

function initErrorLog(){
    app.on('error', function(err){
        log.error(err);
    });

    process.on('uncaughtException', function (e){
        log.error(e);
    });
}

function setWebApis(){
    app.get('/api/v1/server', server.getServerList);
    app.get('/api/v1/server/last-modified-time', server.getServerListLastModifiedTime);
    app.get('/api/v1/server-detailed-status', getServerDetailedStatus);
}

function initModules(){
    log.init();
    server.init();
}

function startServer(){
    if(!global.config.port || global.config.port < 1024 || global.config.port >= 65535){
        console.log("you should set the port for monitor server")
        process.exit(-2);
    }

    http.createServer(app).listen(global.config.port, function(){
        log.info('Dexter Monitor is listening on port ' + global.config.port);
    });
}

function getServerDetailedStatus (req, res){
    res.jsonp({
        "isAlive":"ok",
        "pid": process.pid,
        "memory": process.memoryUsage(),
        "uptime": process.uptime(),
        "ip": global.config.ip,
        "port": global.config.port
    });
}