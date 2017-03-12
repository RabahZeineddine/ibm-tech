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
//app.get('/listRooms', routes.listRooms);
app.get('/', routes.index);
app.get('/accessDenied', routes.accessDenied);

function createResponseData(id, name, value, attachments) {
    var responseData = {
        id: id
        , name: sanitizeInput(name)
        , value: sanitizeInput(value)
        , attachements: []
    };
    attachments.forEach(function (item, index) {
        var attachmentData = {
            content_type: item.type
            , key: item.key
            , url: '/api/favorites/attach?id=' + id + '&key=' + item.key
        };
        responseData.attachements.push(attachmentData);
    });
    return responseData;
}

function sanitizeInput(str) {
    return String(str).replace(/&(?!amp;|lt;|gt;)/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
var saveDocument = function (id, name, value, response) {
    if (id === undefined) {
        // Generated random id
        id = '';
    }
    db.insert({
        name: name
        , value: value
    }, id, function (err, doc) {
        if (err) {
            console.log(err);
            response.sendStatus(500);
        }
        else response.sendStatus(200);
        response.end();
    });
}
app.get('/api/favorites/attach', function (request, response) {
    var doc = request.query.id;
    var key = request.query.key;
    db.attachment.get(doc, key, function (err, body) {
        if (err) {
            response.status(500);
            response.setHeader('Content-Type', 'text/plain');
            response.write('Error: ' + err);
            response.end();
            return;
        }
        response.status(200);
        response.setHeader("Content-Disposition", 'inline; filename="' + key + '"');
        response.write(body);
        response.end();
        return;
    });
});
app.post('/api/favorites/attach', multipartMiddleware, function (request, response) {
    console.log("Upload File Invoked..");
    console.log('Request: ' + JSON.stringify(request.headers));
    var id;
    db.get(request.query.id, function (err, existingdoc) {
        var isExistingDoc = false;
        if (!existingdoc) {
            id = '-1';
        }
        else {
            id = existingdoc.id;
            isExistingDoc = true;
        }
        var name = sanitizeInput(request.query.name);
        var value = sanitizeInput(request.query.value);
        var file = request.files.file;
        var newPath = './public/uploads/' + file.name;
        var insertAttachment = function (file, id, rev, name, value, response) {
            fs.readFile(file.path, function (err, data) {
                if (!err) {
                    if (file) {
                        db.attachment.insert(id, file.name, data, file.type, {
                            rev: rev
                        }, function (err, document) {
                            if (!err) {
                                console.log('Attachment saved successfully.. ');
                                db.get(document.id, function (err, doc) {
                                    console.log('Attachements from server --> ' + JSON.stringify(doc._attachments));
                                    var attachements = [];
                                    var attachData;
                                    for (var attachment in doc._attachments) {
                                        if (attachment == value) {
                                            attachData = {
                                                "key": attachment
                                                , "type": file.type
                                            };
                                        }
                                        else {
                                            attachData = {
                                                "key": attachment
                                                , "type": doc._attachments[attachment]['content_type']
                                            };
                                        }
                                        attachements.push(attachData);
                                    }
                                    var responseData = createResponseData(id, name, value, attachements);
                                    console.log('Response after attachment: \n' + JSON.stringify(responseData));
                                    response.write(JSON.stringify(responseData));
                                    response.end();
                                    return;
                                });
                            }
                            else {
                                console.log(err);
                            }
                        });
                    }
                }
            });
        }
        if (!isExistingDoc) {
            existingdoc = {
                name: name
                , value: value
                , create_date: new Date()
            };
            // save doc
            db.insert({
                name: name
                , value: value
            }, '', function (err, doc) {
                if (err) {
                    console.log(err);
                }
                else {
                    existingdoc = doc;
                    console.log("New doc created ..");
                    console.log(existingdoc);
                    insertAttachment(file, existingdoc.id, existingdoc.rev, name, value, response);
                }
            });
        }
        else {
            console.log('Adding attachment to existing doc.');
            console.log(existingdoc);
            insertAttachment(file, existingdoc._id, existingdoc._rev, name, value, response);
        }
    });
});
app.post('/api/favorites', function (request, response) {
    console.log("Create Invoked..");
    console.log("Name: " + request.body.name);
    console.log("Value: " + request.body.value);
    // var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);
    saveDocument(null, name, value, response);
});
app.delete('/api/favorites', function (request, response) {
    console.log("Delete Invoked..");
    var id = request.query.id;
    // var rev = request.query.rev; // Rev can be fetched from request. if
    // needed, send the rev from client
    console.log("Removing document of ID: " + id);
    console.log('Request Query: ' + JSON.stringify(request.query));
    db.get(id, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            db.destroy(doc._id, doc._rev, function (err, res) {
                // Handle response
                if (err) {
                    console.log(err);
                    response.sendStatus(500);
                }
                else {
                    response.sendStatus(200);
                }
            });
        }
    });
});
app.put('/api/favorites', function (request, response) {
    console.log("Update Invoked..");
    var id = request.body.id;
    var name = sanitizeInput(request.body.name);
    var value = sanitizeInput(request.body.value);
    console.log("ID: " + id);
    db.get(id, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            console.log(doc);
            doc.name = name;
            doc.value = value;
            db.insert(doc, doc.id, function (err, doc) {
                if (err) {
                    console.log('Error inserting data\n' + err);
                    return 500;
                }
                return 200;
            });
        }
    });
});
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
            var docName = 'rooms_token';
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
app.get('/api/favorites', function (request, response) {
    console.log("Get method invoked.. ")
    db = cloudant.use(dbCredentials.dbName);
    var docList = [];
    var i = 0;
    db.list(function (err, body) {
        if (!err) {
            if (len == 0) {}
            else {
                body.rows.forEach(function (document) {
                    db.get(document.id, {
                        revs_info: true
                    }, function (err, doc) {
                        if (!err) {
                            if (doc['_attachments']) {
                                var responseData = createResponseData(doc._id, doc.name, doc.value, attachments);
                            }
                            else {
                                var responseData = createResponseData(doc._id, doc.name, doc.value, []);
                            }
                            docList.push(responseData);
                            i++;
                            if (i >= len) {
                                response.write(JSON.stringify(docList));
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
        }
        else {
            console.log(err);
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
                                    console.log(room + ":" + JSON.stringify(doc['rooms'][room]));
                                }
                                response.write(JSON.stringify(rooms));
                                console.log('ending response..');
                                response.end();
                            }else{
                                response.write(JSON.stringify(rooms));
                                response.end();
                            }
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
    console.log("ID: " + CLOUDANT_DOCUMENT_ID);
    db.get(CLOUDANT_DOCUMENT_ID, {
        revs_info: true
    }, function (err, doc) {
        if (!err) {
            var rooms = doc.rooms;
            var len = Object.keys(doc.rooms).length;
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
app.get('/rooms/img', function (request, response) {
    var name = sanitizeInput(request.query.room);
    var ip = sanitizeInput(request.query.ip);
    var token = sanitizeInput(request.query.token);
    getCloudantInfo();
    if (token.localeCompare(CLOUDANT_TOKEN) != 0) {
        response.send("Access Denied! ");
    }
    else {
        var img = fs.readFileSync('public/images/' + name + '.jpg');
        response.writeHead(200, {
            'Content-Type': 'image/jpg'
        });
        response.end(img, 'binary');
    }
});
app.get('/rooms', function (request, response) {
    //link /rooms?token=Token&room=Name&ip=IP
    var name = sanitizeInput(request.query.room);
    var ip = sanitizeInput(request.query.ip);
    var token = sanitizeInput(request.query.token);
    var update_fleg = false;
    getCloudantInfo();
    if (token.localeCompare(CLOUDANT_TOKEN) != 0) {
        response.send("Access Denied! ");
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
http.createServer(app).listen(app.get('port'), '0.0.0.0', function () {
    console.log('Express server listening on port ' + app.get('port'));
});