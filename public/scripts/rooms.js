
 var REST_DATA = "api/rooms/list";
 var REST_DATA_EDIT = "api/rooms/edit";


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
    div_header.innerHTML = "<h1>Rooms</h1>";
      var div = document.getElementById("content");
      var table = document.createElement('table');
      table.setAttribute("class","table table-responsible table-hover");
      table.innerHTML = '<thead><tr><th>Image</th><th>Name</th><th>IP</th><th></th></tr></thead>';

      for(i = 0 ; i < rooms.length;i++){
        table.innerHTML += '<tr>'
              +'<td><img class="img-responsive table-img" src="images/'+rooms[i].name+'.jpg" alt="no image"/></td>'
              +'<td>'+rooms[i].name+'</td>'
              +'<td>'+rooms[i].ip+'</td>'
              +'<td><button type="button" class="btn btn-primary" data-toggle="modal" data-target="#editModal" data-name="'+rooms[i].name+'" data-ip="'+rooms[i].ip+'" data-id="'+rooms[i].id+'">Edit</button></td>'
              +'</tr>';
      }

      div.appendChild(table);


  }else{
    //No rooms available
    div_header.innerHTML = "<h1>There is no room registered</h1>";
  }
  stopLoadingMessage();

},function(err){
  if(err){
    console.error(err);
  }
});

}





function showLoadingMessage() {
	document.getElementById('loadingImage').innerHTML = ""
			+ "<img height=\"100\" width=\"100\" src=\"images/loading.gif\"></img> Loading data";
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

function updateRoom(){
  var name = document.getElementById("name_input").value;
  var ip   = document.getElementById("ip_input").value;
  var id   = document.getElementById("hidden_id").value;

  var data = {
    id: id,
    name: name,
    ip: ip
  }

  xhrPut(REST_DATA_EDIT, data, function() {
    console.log('updated: ',data);
  },function(err){
    console.error(err);
  });


}

showLoadingMessage();
loadRooms();
