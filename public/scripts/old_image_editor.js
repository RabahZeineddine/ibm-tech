$(document).ready(function(){
    var canvas = document.getElementById("preview");
    var context = canvas.getContext("2d");

    var bounds = $("#text-bounds");

    var selectedImage = new Image();
    var text = "IBM";
    var fontName = "IBMLogo";
    var fontSize = 100;
    var fontColor = "#000000";
    var fontHeight = 0;

    var offset = {x: 0, y:0};
    var textOffset = {x: 0, y:0};

    var startPosition = {x: 0, y:0};
    var startLocation = {x: 0, y:0};
    var movesTextEnabled = false;
    var movesBackgroundEnabled = false;

    var txtFontSize = $("#font-size");
    txtFontSize.val(fontSize);

    var colorPicker = $("#font-color");
    colorPicker.val(fontColor);

    var images = $("#images");
    var numberOfPhotos = 10
    for (var i = 1; i <= numberOfPhotos; i++) {
        var html = "";
        if (i % 2 == 0) {
            html += '<figure>';
        }else {
            html += '<figure class="first-child">';
        }
        html += '<img src="images/gallery/ibm-' + i + '.jpg" />';
        html += '<figcaption>' + i + ' - IBM</figcaption></figure>';
        images.append(html);
    }

    $("#gallery figure").click(function(){
        selectedImage = $(this).find("img")[0];
        offset.x = 0;
        offset.y = 0;
        renderAllLayers();
    });

    $("#text-value").keyup(function() {
        text = this.value;
        renderAllLayers();
    });

    $("#font-name").change(function() {
        fontName = this.value;
        renderAllLayers();
    });

    $("#font-color").change(function() {
        fontColor = this.value;
        renderAllLayers();
    });

    $("#font-size").keyup(function(event) {
        fontSize = parseInt(this.value);

        if(event.keyCode == 38) {
            if (event.shiftKey) {
                fontSize += 10;
            }else {
                fontSize++;
            }
        }else if(event.keyCode == 40) {
            if (event.shiftKey) {
                fontSize -= 10;
            }else {
                fontSize--;
            }
        }
        this.value = fontSize;
        renderAllLayers();
    });

    $("#font-size").change(function() {
        if (fontSize < 1) {
            fontSize = 1
        }else if (fontSize > 400) {
            fontSize = 400;
        }
        this.value = fontSize;
        renderAllLayers();
    });

    $("#canvas").mousedown(function(event) {
        startPosition.x = offset.x;
        startPosition.y = offset.y;
        startLocation.x = event.screenX;
        startLocation.y = event.screenY;
        movesBackgroundEnabled = true;
    });

    $("#canvas").mousemove(function(event) {
        if (movesBackgroundEnabled) {
            var currentLocation = {x: event.screenX, y: event.screenY};
            offset.x = startPosition.x - (startLocation.x - currentLocation.x);
            offset.y = startPosition.y - (startLocation.y - currentLocation.y);

            renderAllLayers();
        }
    });

    $("body").mouseup(function(event) {
        movesEnded();
    });

    $("#text-bounds").mousedown(function(event) {
        $("#text-bounds").addClass("visible");
        startPosition.x = textOffset.x;
        startPosition.y = textOffset.y;
        startLocation.x = event.screenX;
        startLocation.y = event.screenY;
        movesTextEnabled = true;
    });

    $("#text-bounds").mousemove(function(event) {
        if (movesTextEnabled) {
            var currentLocation = {x: event.screenX, y: event.screenY};
            textOffset.x = startPosition.x - (startLocation.x - currentLocation.x);
            textOffset.y = startPosition.y - (startLocation.y - currentLocation.y);

            renderAllLayers();
        }
    });

    function movesEnded() {
        movesBackgroundEnabled = false;
        movesTextEnabled = false;
        $("#text-bounds").removeClass("visible");
    }

    function renderAllLayers() {
        context.clearRect(0, 0, canvas.width, canvas.height);
        renderBackground();
        renderText();
    }

    function renderBackground() {
        var width = canvas.width;
        var height = canvas.height;

        var imageWidth = selectedImage.width;
        var imageHeight = selectedImage.height;

        if (imageWidth > imageHeight) {
            imageWidth = imageWidth * (height / imageHeight);
            imageHeight = height;
        }else {
            imageHeight = imageHeight * (width / imageWidth);
            imageWidth = width;
        }
        offset.x = (canvas.width - imageWidth) * 0.5
        context.drawImage(selectedImage, offset.x, offset.y, imageWidth, imageHeight);
    }

    function renderText() {
        updateBoundsSize();

        var x = $("#preview").position().left;
        x -= bounds.width() / 2;
        x += $("#preview").width() / 2;

        var y = $("#preview").position().top;
        y -= bounds.height() / 2;
        y += $("#preview").height() / 2;

        y += textOffset.y;
        x += textOffset.x;

        bounds.css("left", x + "px");
        bounds.css("top", y + "px");

        context.font = fontSize + 'px "' + fontName + '"';
        context.fillStyle = fontColor;
        context.textAlign = "center";

        wrapText(context, text);
    }

    function wrapText(context, text) {
        var lineHeight = fontHeight * 1.0
        var lines = text.split('\n');
        var numberOfLines = lines.length;

        var xScale = canvas.width / $("#preview").width();
        var yScale = canvas.height / $("#preview").height();

        var x = ($("#preview").position().left - $("#canvas").position().left) * 0.5;
        x += bounds.position().left + bounds.width() * 0.5;
        x -= $("#preview").position().left;
        x *= xScale;

        var y = bounds.position().top - $("#preview").position().top + bounds.height()
        y *= yScale;
        y -= (numberOfLines - 1) * lineHeight

        for(var i = 0; i < lines.length; i++) {
            var lineText = lines[i];
            context.fillText(lineText, x, y + (lineHeight * i));
        }
    }

    function updateBoundsSize() {
        var lines = text.split('\n');
        var numberOfLines = lines.length;

        var biggerText = "";
        for(var i = 0 ; i < numberOfLines ; i ++){
            if(biggerText.length < lines[i].length){
                biggerText= lines[i];
            }
        }

        var tempText = $("<span style='display:inline-block; font-size:" + fontSize + "px; font-family:" + fontName + "'>" + biggerText + "</span>");
        $("body").append(tempText);

        var xScale = $("#preview").width() / canvas.width;
        var yScale = $("#preview").height() / canvas.height;

        var textWidth = tempText.width()
        fontHeight = parseInt(window.getComputedStyle(tempText.get(0)).fontSize, null);

        bounds.width(textWidth * xScale);
        bounds.height(fontHeight * numberOfLines * yScale);

        tempText.remove();
    }

    renderAllLayers();
});
