module.exports = {
    index: function (req, res) {
        var token = req.session.user_token;
        if (token !== null && token != '') {
            res.render('index.html', {
                authenticated: token
            });
        }
        else {
            res.render('index.html');
        }
    }
    , //	listRooms : function(req, res) {
    //		res.render('listRooms.html');
    //	},
    accessDenied: function (req, res) {
        var error = req.session.error;
        req.session.error = '';
        res.render('index.html', {
            error: error
        });
    }
}