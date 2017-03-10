module.exports = {
	index : function(req, res) {
		res.render('index.html');
	},
	listRooms : function(req, res) {
		res.render('listRooms.html');
	},
	accessDenied: function(req,res){
		res.render('index.html',{error: req.session.error});
	}
}