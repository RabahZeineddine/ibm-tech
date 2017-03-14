
 var REST_DATA = "api/rooms/list";
 var REST_DATA_EDIT = "api/rooms/edit";
 var REST_DATA_DELETE = "api/rooms/delete";


function loadRooms(){

xhrGet(REST_DATA , function(data){
  // var receivedItems = data || [];
  var receivedRooms = data || [];
  var rooms = [];
  var i;
  //Make sure the received rooms have correct format
  for(i = 0;i < receivedRooms.length;i++){

    var room = receivedRooms[i];

    if(room && 'ip' in room){
      rooms.push(room);
      }
  }
  var div_header = document.getElementById("page-header");
  if(rooms.length > 0 ){
    div_header.innerHTML = "<h1>Rooms<a href='/CreateRoom' class='btn btn-default pull-right'>Add new room</a></h1>";
      var div = document.getElementById("content");
      var table = document.createElement('table');
      table.setAttribute("class","table table-responsible table-hover");
      table.innerHTML = '<thead><tr><th>Image</th><th>Name</th><th>IP</th><th></th></tr></thead>';

      for(i = 0 ; i < rooms.length;i++){
        table.innerHTML += '<tr class="table_row">'
              +'<td class="img_td"><div class="img_div"> <div class="hover_edit_div"><a href="/editRoomPic?id='+rooms[i].id+'">Edit</a></div><img class="img-responsive table-img" src="images/Rooms/'+rooms[i].name+'.jpg" alt="no image"/></div></td>'
              +'<td>'+rooms[i].name+'</td>'
              +'<td>'+rooms[i].ip+'</td>'
              +'<td><a href="#editModal" class="edit_room_link" data-toggle="modal" data-name="'+rooms[i].name+'" data-ip="'+rooms[i].ip+'" data-id="'+rooms[i].id+'"><span class="glyphicon glyphicon-edit" aria-hidden="true"></span></a> '
                    +'<a href="#deleteModal" class="delete_room_link" data-toggle="modal" data-id="'+rooms[i].id+'"><span class="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>'
              +'</tr>';
      }

      div.appendChild(table);


  }else{
    //No rooms available
    div_header.innerHTML = "<h1>There is no room registered<a href='/CreateRoom' class='btn btn-default pull-right'>Add new room</a></h1>";
  }
  stopLoadingMessage();

},function(err){
  if(err){
    console.error(err);
  }
});

}





function showLoadingMessage() {
	document.getElementById('loadingImage').innerHTML = "<br>"
			+ "<img height=\"35\" width=\"35\" src=\"images/loading.gif\"></img> Loading data";
}

function stopLoadingMessage() {
	document.getElementById('loadingImage').innerHTML = "";

}


$('#editModal').on('show.bs.modal', function (event) {

  var button = $(event.relatedTarget)
  var name = button.data('name')
  var ip = button.data('ip');
  var id = button.data('id');
  document.getElementById("name_input").value = name;
  document.getElementById("ip_input").value = ip;
  document.getElementById("hidden_id").value = id;
});

$('#deleteModal').on('show.bs.modal', function (event) {
  var button = $(event.relatedTarget)
  var id = button.data('id');
  document.getElementById("hidden_delete_id").value = id;
});


function updateRoom(){
  document.getElementById("save_btn").innerHTML = "Saving <img src='images/loader.gif'/>";
  var name = document.getElementById("name_input").value;
  var ip   = document.getElementById("ip_input").value;
  var id   = document.getElementById("hidden_id").value;

  var data = {
    id: id,
    name: name,
    ip: ip
  }

  xhrPut(REST_DATA_EDIT, data, function() {
      window.location.href = '/list';
  },function(err){
    console.error(err);
  });


}


function deleteRoom(){
    document.getElementById("delete_btn").innerHTML = "Deleting <img src='images/loader.gif'/>";
    var id   = document.getElementById("hidden_delete_id").value;
    if (id) {
		xhrDelete(REST_DATA_DELETE + '?id=' + id, function() {
			window.location.href="/list";
		}, function(err) {
			console.error(err);
		});
	} else if (id == null) {
		
	}
}

showLoadingMessage();
loadRooms();
