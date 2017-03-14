/**
 * Module dependencies.
 */
var express = require('express')
    , routes = require('./routes/routes')
    , session = require('express-session')
http = require('http'), path = require('path'), fs = require('fs');
var CLOUDANT_TOKEN = 'token'; // initial value for the first deploy when cloudant does not exist
var CLOUDANT_DOCUMENT_ID = '123';
var app = express();
var db;
var cloudant;
var fileToUpload;
var dbCredentials = {
    dbName: 'my_sample_db_test'
};
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var multipart = require('connect-multiparty')
var multipartMiddleware = multipart();
// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));
app.use(session({
    secret: 'ssshhhh'
}));
// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    }
    else { //When running locally, the VCAP_SERVICES will not be set
        // When running this app locally you can get your Cloudant credentials
        // from Bluemix (VCAP_SERVICES in "cf env" output or the Environment
        // Variables section for an app in the Bluemix console dashboard).
        // Once you have the credentials, paste them into a file called vcap-local.json.
        // Alternately you could point to a local database here instead of a
        // Bluemix service.
        // url will be in this format: https://username:password@xxxxxxxxx-bluemix.cloudant.com
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }
    cloudant = require('cloudant')(dbCredentials.url);
    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function (err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });
    db = cloudant.use(dbCredentials.dbName);
}
initDBConnection();
app.get('/', routes.index);
app.get('/accessDenied', routes.accessDenied);

function sanitizeInput(str) {
    return String(str).replace(/&(?!amp;|lt;|gt;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
app.get('/list', function (request, response) {
    if (request.session.user_token && request.session.user_token == CLOUDANT_TOKEN) {
        //Give access to the user or refresh page
        if (request.session.error != '' && request.session.error) {
            var error = request.session.error;
            request.session.error = '';
            response.render('listRooms.html', {
                error: error
            });
        }
        else if (request.session.alertMessage && request.session.alertMessage != '') {
            var alertMessage = request.session.alertMessage;
            request.session.alertMessage = '';
            response.render('listRooms.html', {
                alertMessage: alertMessage
            });
        }
        else {
            response.render('listRooms.html');
        }
    }
    else {
        request.session.user_token = '';
        request.session.error = 'Access denied, try again with a valid token.';
        response.redirect('/accessDenied');
    }
});
//Get the pre-defined token in cloudant
app.get('/api/rooms/token', function (request, response) {
    console.log("Get token method invoked..");
    db = cloudant.use(dbCredentials.dbName);
    var docList = [];
    var user_token = sanitizeInput(request.query.token);
    db.list(function (err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('total # of docs -> ' + len);
        }
        if (len == 0) {
            //No Docs found.
            //push token doc
            var docName = 'rooms';
            var docToken = CLOUDANT_TOKEN;
            db.insert({
                name: docName
                , token: docToken
            }, '', function (err, doc) {
                if (err) {
                    console.log(err);
                }
                else {
                    console.log('Document : ' + JSON.stringify(doc));
                    if (user_token.localeCompare(doc.docToken) == 0) {
                        response.write('true');
                        request.session.user_token = user_token;
                    }
                    else {
                        response.write('false');
                    }
                    console.log('ending response...');
                    response.end();
                }
            });
        }
        else {
            body.rows.forEach(function (document) {
                db.get(document.id, {
                    revs_info: true
                }, function (err, doc) {
                    if (!err) {
                        if (doc['token']) {
                            CLOUDANT_DOCUMENT_ID = doc._id;
                            CLOUDANT_TOKEN = doc.token;
                            if (user_token.localeCompare(doc.token) == 0) {
                                response.write('true');
                                request.session.user_token = user_token;
                            }
                            else {
                                response.write('false');
                            }
                            console.log('ending response...');
                            response.end();
                        }
                    }
                    else {
                        console.log(err);
                    }
                });
            });
        }
    });
});
app.get('/api/rooms/list', function (request, response) {
    console.log("Get rooms method invoked..");
    db = cloudant.use(dbCredentials.dbName);
    var rooms = []
    db.list(function (err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('total # of docs -> ' + len);
            if (len != 0) {
                body.rows.forEach(function (document) {
                    db.get(document.id, {
                        revs_info: true
                    }, function (err, doc) {
                        if (!err) {
                            if (doc['rooms']) {
                                for (var room in doc['rooms']) {
                                    if (doc['rooms'][room]) {
                                        rooms.push({
                                            "id": doc['rooms'][room]['id']
                                            , "name": doc['rooms'][room]['name']
                                            , "ip": doc['rooms'][room]['ip']
                                            , "text": doc['rooms'][room]['text']
                                        });
                                    }
                                }
                            }
                            response.write(JSON.stringify(rooms));
                            console.log('ending response..');
                            response.end();
                        }
                        else {
                            console.log(err);
                        }
                    });
                });
            }
        }
    });
});
app.put('/api/rooms/edit', function (request, response) {
    console.log('Update Room invoked...');
    var id_room = request.body.id;
    var name_room = sanitizeInput(request.body.name);
    var ip_room = request.body.ip;
    //Make change if the user is authenticated
    if (request.session.user_token && request.session.user_token == CLOUDANT_TOKEN) {
        db.get(CLOUDANT_DOCUMENT_ID, {
            revs_info: true
        }, function (err, doc) {
            if (!err) {
                var rooms = doc.rooms;
                for (var room in rooms) {
                    if (rooms[room]['id'] == id_room) {
                        rooms[room]['ip'] = ip_room;
                        rooms[room]['name'] = name_room;
                    }
                }
                doc.rooms = rooms;
                db.insert(doc, doc.id, function (err, doc) {
                    if (err) {
                        console.log('Error inserting data\n ' + err);
                        request.session.error = 'Error on updating.Try again later!';
                        response.write('false');
                        response.end();
                    }
                    request.session.alertMessage = 'Room updated successfully';
                    response.write('true');
                    response.end();
                });
            }
            else {
                console.log(err);
            }
        });
    }
    else {
        request.session.user_token = '';
        request.session.error = 'Access denied, try again with a valid token.';
        response.redirect('/accessDenied');
    }
});

function getCloudantInfo() {
    db.list(function (err, body) {
        if (!err) {
            var len = body.rows.length;
            console.log('total # of docs -> ' + len);
        }
        if (len > 0) {
            body.rows.forEach(function (document) {
                db.get(document.id, {
                    revs_info: true
                }, function (err, doc) {
                    if (!err) {
                        if (doc['token']) {
                            CLOUDANT_DOCUMENT_ID = doc._id;
                            CLOUDANT_TOKEN = doc.token;
                        }
                    }
                    else {
                        console.log(err);
                    }
                });
            });
        }
    });
}
//This method return the room image, if the room exists if not, it creates a new room with defualt ibm image :)
app.get('/rooms/img', function (request, response) {
    getCloudantInfo();
    var name = sanitizeInput(request.query.room);
    var ip = sanitizeInput(request.query.ip);
    var token = sanitizeInput(request.query.token);
    var img;
    if (token.localeCompare(CLOUDANT_TOKEN) != 0) {
        response.sendStatus(403);
    }
    else {
        //Check if room exists
        var exists = false;
        var last_id;
        db = cloudant.use(dbCredentials.dbName);
        var rooms = []
        db.list(function (err, body) {
            if (!err) {
                var len = body.rows.length;
                console.log('total # of docs -> ' + len);
                if (len != 0) {
                    body.rows.forEach(function (document) {
                        db.get(document.id, {
                            revs_info: true
                        }, function (err, doc) {
                            if (!err) {
                                if (doc['rooms']) {
                                    var rooms = doc.rooms;
                                    for (var room in rooms) {
                                        if (rooms[room]['name'].localeCompare(name) == 0) {
                                            console.log('Room already exists');
                                            exists = true;
                                            //Change the ip for the new one
                                            rooms[room]['ip'] = ip;
                                        }
                                        last_id = rooms[room]['id'];
                                    }
                                    if (!exists) {
                                        last_id = parseInt(last_id) + 1;
                                        var name_room = "Room_" + last_id;
                                        //Create a new room if it does not exist! get the image coordenates later..
                                        rooms[name_room] = {
                                            "id": last_id
                                            , "ip": ip
                                            , "name": name
                                            , "text": "IBM"
                                        };
                                        console.log('New Room has been added');
                                        fs.linkSync("public/images/default_room.jpg", "public/images/Rooms/" + name + ".jpg");
                                        img = fs.readFileSync('public/images/Rooms/' + name + '.jpg');
                                    }
                                    doc.rooms = rooms;
                                    console.log(rooms);
                                    db.insert(doc, doc.id, function (err, doc) {
                                        if (err) {
                                            console.log('Error inserting data\n ' + err);
                                            img = fs.readFileSync('public/images/Rooms/default_room.jpg');
                                            console.log('ending updates..');
                                            response.writeHead(200, {
                                                'Content-Type': 'image/jpg'
                                            });
                                            response.end(img, 'binary');
                                        }
                                        else {
                                            console.log('Data updated successfully!');
                                            img = fs.readFileSync('public/images/Rooms/' + name + '.jpg');
                                            console.log('ending updates..');
                                            response.writeHead(200, {
                                                'Content-Type': 'image/jpg'
                                            });
                                            response.end(img, 'binary');
                                        }
                                    });
                                }
                                //    
                            }
                            else {
                                img = fs.readFileSync('public/images/Rooms/default_room.jpg');
                                console.log('ending updates..');
                                response.writeHead(200, {
                                    'Content-Type': 'image/jpg'
                                });
                                response.end(img, 'binary');
                                console.log(err);
                            }
                        });
                    });
                }
                else {
                    img = fs.readFileSync('public/images/Rooms/default_room.jpg');
                    console.log('ending updates..');
                    response.writeHead(200, {
                        'Content-Type': 'image/jpg'
                    });
                    response.end(img, 'binary');
                }
            }
            else {
                img = fs.readFileSync('public/images/Rooms/default_room.jpg');
                console.log('ending updates..');
                response.writeHead(200, {
                    'Content-Type': 'image/jpg'
                });
                response.end(img, 'binary');
            }
        });
    }
});
app.get('/logout', function (request, response) {
    request.session.destroy();
    response.redirect('/');
});
app.get('/rooms', function (request, response) {
    //link /rooms?token=Token&room=Name&ip=IP
    var name = sanitizeInput(request.query.room);
    var ip = sanitizeInput(request.query.ip);
    var token = sanitizeInput(request.query.token);
    var update_fleg = false;
    getCloudantInfo();
    if (token.localeCompare(CLOUDANT_TOKEN) != 0) {
        response.sendStatus(403);
    }
    else {
        db.get(CLOUDANT_DOCUMENT_ID, {
            revs_info: true
        }, function (err, doc) {
            if (!err) {
                var rooms = doc.rooms;
                for (var room in rooms) {
                    if (rooms[room]['name'] == name) {
                        rooms[room]['ip'] = ip;
                        update_fleg = true;
                    }
                }
                if (update_fleg) {
                    doc.rooms = rooms;
                    db.insert(doc, doc.id, function (err, doc) {
                        if (err) {
                            console.log('Error inserting data\n ' + err);
                            response.write('false');
                            response.end();
                        }
                        response.write('true');
                        response.end();
                    });
                }
                else {
                    response.write('Room not found!');
                    response.end();
                }
            }
            else {
                console.log(err);
            }
        });
    }
});
app.delete('/api/rooms/delete', function (request, response) {
    console.log('Delete room method invoked..');
    var id = request.query.id;
    if (request.session.user_token && request.session.user_token == CLOUDANT_TOKEN) {
        db.get(CLOUDANT_DOCUMENT_ID, {
            revs_info: true
        }, function (err, doc) {
            if (!err) {
                var rooms = doc.rooms;
                for (var room in rooms) {
                    if (rooms[room]['id'] == id) {
                        //Remove image from folder.
                        fs.unlink('public/images/Rooms/' + rooms[room]['name'] + '.jpg', function () {
                            delete rooms[room];
                            doc.rooms = rooms;
                            console.log(doc.rooms);
                            db.insert(doc, doc.id, function (err, doc) {
                                if (err) {
                                    console.log('Error inserting data\n ' + err);
                                    request.session.error = 'Error on deleting.Try again later!';
                                    response.write('false');    
                                    
                                }else{
                                request.session.alertMessage = 'Room deleted successfully';
                                response.write('true');
                             
                                    }
                                   response.end();
//                                response.redirect('/list');
                            });
                        });
                    }
                }
            }
            else {
                console.log(err);
            }
        });
    }
    else {
        request.session.user_token = '';
        request.session.error = 'Access denied, try again with a valid token.';
        response.redirect('/accessDenied');
    }
});
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});