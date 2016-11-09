#!/usr/bin/env nodejs

'use strict';

const http = require('http');
const https=require('https');
const fs = require('fs');
const url = require('url');
const mongoose = require('mongoose');
const ua = require('universal-analytics');
const uuid = require('uuid');
const requestIp = require('request-ip');

let uid = '';
let event = 'email-open';
let action = 'open';
let label = 'email-pixel';
let trafficSource = '';
let campaign = 'email-campaign';
let medium = 'email';
let trafficPath = '/email';
let clientIp = '127.0.0.1';
let userID = '';

var options = {
	key: fs.readFileSync('/etc/nginx/ssl/imgrkdio.key'),
	cert: fs.readFileSync('/etc/nginx/ssl/cert/c4c75b3b0d12147b.crt')
};

const mongodbUri = 'mongodb://rkd:RKDX2016@ds041506.mlab.com:41506/rkd-beacon';
mongoose.connect(mongodbUri);

let db = mongoose.connection;

let requestSchema = mongoose.Schema({
    uid: String,
    event: String,
    action: String,
    label: String,
    trafficSource: String,
    campaign: String,
    medium: String,
    trafficPath: String,
    userID: String,
    clientIp: String,
    date: { type: Date, default: Date.now }
});


let PixelRender = mongoose.model('PixelRender', requestSchema);

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function callback() {

    console.log('Database Connection Made');

    var app =  function (req, res) {

        let requestURL = url.parse(req.url, true)['pathname'];
        let queryData = url.parse(req.url, true).query;


        let imgHex = '47494638396101000100800000dbdfef00000021f90401000000002c00000000010001000002024401003b';
        let imgBinary = new Buffer(imgHex, 'hex');
        res.writeHead(200, {
            'Content-Type': 'image/gif'
        });
        res.end(imgBinary, 'binary');


        clientIp = requestIp.getClientIp(req);
        clientIp=clientIp.replace(/^.*:/, '');


        let query = PixelRender.findOne({
            'clientIp': clientIp
        });


        query.exec(function (err, PixelRender) {
            if (err) return;
            

            if (PixelRender !== null) {
                console.log('Repeat IP Found');

                let visitor = ua(PixelRender.uid, PixelRender.userID, {
                    strictCidFormat: false
                }, {
                    https: true
                });

                let params = {
                    ec: PixelRender.event,
                    ea: PixelRender.action,
                    el: PixelRender.label,
                    dp: PixelRender.trafficPath,
                    cs: PixelRender.trafficSource,
                    cm: PixelRender.medium,
                    cn: PixelRender.campaign,
                    uip: PixelRender.clientIp
                };

                visitor.event(params).send();
                console.log('Repeat User Analytics Sent');

            } else {
            	
                   let PixelRender = mongoose.model('PixelRender', requestSchema);

                    if (requestURL == '/log.gif') {

                    userID = uuid.v4();


                    if (queryData.uid) {
                        uid = queryData.uid;
                    }

                    if (queryData.event) {
                        event = queryData.event;
                    }

                    if (queryData.action) {
                        action = queryData.action;
                    }

                    if (queryData.label) {
                        label = queryData.label;
                    }

                    if (queryData.trafficSource) {
                        trafficSource = queryData.trafficSource;
                    }

                    if (queryData.campaign) {
                        campaign = queryData.campaign;
                    }

                    if (queryData.medium) {
                        medium = queryData.medium;
                    }

                    if (queryData.trafficPath) {
                        trafficPath = '/' + queryData.trafficPath;
                    }

                    let visitor = ua(uid, userID, {
                        strictCidFormat: false
                    }, {
                        https: true
                    });

                    let params = {
                        ec: event,
                        ea: action,
                        el: label,
                        dp: trafficPath,
                        cs: trafficSource,
                        cm: medium,
                        cn: campaign,
                        uip: clientIp
                    };


                    let connection = new PixelRender({
                        uid: uid,
                        event: event,
                        action: action,
                        label: label,
                        trafficSource: trafficSource,
                        campaign: campaign,
                        medium: medium,
                        trafficPath: trafficPath,
                        userID: userID,
                        clientIp: clientIp
                    });

                    connection.save();
                    console.log('Database Updated');


                    visitor.event(params).send();

                    console.log('Analytics Sent');


                } else {
                    console.log('No Pixel Parameters Passed');
                }

            }

        });


    };

    http.createServer(app).listen(80);
    https.createServer(options,app).listen(443);
    console.log('App Running');


});
