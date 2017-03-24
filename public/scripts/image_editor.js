$(document).ready(function(){
  /* UI Elements */
  var tools = $("#tools");
  var preview = $("#preview");
  var canvas = $("#canvas");
  var context = canvas.get(0).getContext("2d");
  var textBounds = $("#text-bounds");
  var backgroundBounds = $("#background-bounds");
  var txtBackgroundScale = $("#background-scale");
  var backgroundColorPicker = $("#background-color");
  var txtTextValue = $("#text-value");
  var optFontName = $("#font-name");
  var txtFontSize = $("#font-size");
  var colorPicker = $("#font-color");
  var images = $("#images");
  var radioTextAlign = $("input[name=text-align]");

  /* Image Parameters */
  var selectedImage;
  var imageWidth;
  var imageHeight;
  var backgroundScale = 1.0;
  var backgroundColor = "#ffffff";
  var text = "IBM";
  var textWidth = 0;
  var textHeight = 0;
  var fontName = "IBMLogo";
  var MIN_FONT_SIZE = 8;
  var MAX_FONT_SIZE = 1000;
  var fontSize = 100;
  var fontColor = "#000000";
  var fontHeight = 0;
  var textAlign = "left";
  var backgroundOffset = {x: 0, y:0};
  var textOffset = {x: 0, y:0};

  /* Moving Events */
  var startPosition = {x: 0, y:0};
  var startLocation = {x: 0, y:0};
  var movesTextEnabled = false;
  var movesBackgroundEnabled = false;

  /* Initial State */
  canvas.canvasWidth = document.getElementById("canvas").width;
  canvas.canvasHeight = document.getElementById("canvas").height;

  txtFontSize.val(fontSize);
  colorPicker.val(fontColor);
  txtTextValue.val(text);

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

  /* Events */
  $("#gallery figure").click(function(){
    selectedImage = $(this).find("img")[0];
    imageWidth = selectedImage.width;
    imageHeight = selectedImage.height;

    if (imageWidth > imageHeight) {
      imageWidth = imageWidth * (canvas.canvasHeight / imageHeight);
      imageHeight = canvas.canvasHeight;
    }else {
      imageHeight = imageHeight * (canvas.canvasWidth / imageWidth);
      imageWidth = canvas.canvasWidth;
    }
    txtBackgroundScale.val("1.0");
    backgroundScale = 1.0;

    backgroundOffset.x = (canvas.canvasWidth - imageWidth) * 0.5
    backgroundOffset.y = (canvas.canvasHeight - imageHeight) * 0.5
    renderAllLayers();
  });

  txtTextValue.keyup(function() {
    text = this.value;
    renderAllLayers();
  });

  optFontName.change(function() {
    fontName = this.value;
    renderAllLayers();
  });

  colorPicker.change(function() {
    fontColor = this.value;
    renderAllLayers();
  });

  txtFontSize.keydown(function(event) {
    fontSize = parseInt(this.value.match(/\d+/g));

    if(event.keyCode == 38) {
      if (event.shiftKey) {
        fontSize += 10;
      }else {
        fontSize++;
      }
      this.value = fontSize;
    }else if(event.keyCode == 40) {
      if (event.shiftKey) {
        fontSize -= 10;
      }else {
        fontSize--;
      }
      this.value = fontSize;
    }

    renderAllLayers();
  });

  txtFontSize.blur(function() {
    fontSize = this.value.match(/\d+/g);

    if (fontSize < MIN_FONT_SIZE || fontSize == "") {
      fontSize = MIN_FONT_SIZE;
    }else if (fontSize > MAX_FONT_SIZE) {
      fontSize = MAX_FONT_SIZE;
    }else {
      fontSize = parseInt(fontSize);
    }

    this.value = fontSize;
    renderAllLayers();
  });

  txtFontSize.keyup(function(event) {
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      fontSize = parseInt(this.value.match(/\d+/g));
      renderAllLayers();
    }
  });

  radioTextAlign.change(function(event) {
    $("label.text-align").removeAttr("data-checked");
    $("#" + event.currentTarget.id).parent().attr("data-checked", "true");

    textAlign = this.value;
    renderAllLayers();
  });

  backgroundColorPicker.change(function() {
    backgroundColor = this.value;
    renderAllLayers();
  });

  txtBackgroundScale.blur(function() {
    backgroundScale = this.value.match(/[0-9]+.[0-9][1,2,3,4,5,6,7,8,9]*/g);
    if (backgroundScale == null || backgroundScale == "") {
      backgroundScale = 1.0;
    }
    backgroundScale = parseFloat(backgroundScale);
    this.value = backgroundScale;
    renderAllLayers();
  });

  txtBackgroundScale.keyup(function(event) {
    if (event.keyCode >= 48 && event.keyCode <= 57) {
      backgroundScale = this.value.match(/[0-9]+.[0-9][1,2,3,4,5,6,7,8,9]*/g);
      backgroundScale = parseFloat(backgroundScale);
      renderAllLayers();
    }
  });

  txtBackgroundScale.keydown(function() {
    backgroundScale = parseFloat(this.value.match(/[0-9]+.[0-9][1,2,3,4,5,6,7,8,9]*/g));

    if(event.keyCode == 38) {
      if (event.shiftKey) {
        backgroundScale += 0.1;
      }else {
        backgroundScale += 0.01;
      }
      this.value = backgroundScale.toFixed(2);
    }else if(event.keyCode == 40) {
      if (event.shiftKey) {
        backgroundScale -= 0.1;
      }else {
        backgroundScale -= 0.01;
      }
      this.value = backgroundScale.toFixed(2);
    }

    renderAllLayers();
  });

  /* Moving Events */
  backgroundBounds.mousedown(function(event) {
    backgroundBounds.addClass("visible");

    startPosition.x = backgroundOffset.x;
    startPosition.y = backgroundOffset.y;
    startLocation.x = event.screenX;
    startLocation.y = event.screenY;
    movesBackgroundEnabled = true;
  });

  $("html").mouseup(function(event) {
    movesEnded();
  });

  function movesEnded() {
    movesBackgroundEnabled = false;
    movesTextEnabled = false;
    textBounds.removeClass("visible");
    backgroundBounds.removeClass("visible");
  }

  textBounds.mousedown(function(event) {
    textBounds.addClass("visible");
    startPosition.x = textOffset.x;
    startPosition.y = textOffset.y;
    startLocation.x = event.screenX;
    startLocation.y = event.screenY;
    movesTextEnabled = true;
  });

  $("body").mousemove(function(event) {
    if (movesTextEnabled) {
      var currentLocation = {x: event.screenX, y: event.screenY};
      textOffset.x = startPosition.x - (startLocation.x - currentLocation.x);
      textOffset.y = startPosition.y - (startLocation.y - currentLocation.y);

      if (textOffset.x < -(canvas.width() * 0.5 + textWidth * 0.5) + 25) {
        textOffset.x = -(canvas.width() * 0.5 + textWidth * 0.5) + 25;
      }
      if (textOffset.x > (canvas.width() * 0.5 + textWidth * 0.5) - 25) {
        textOffset.x = (canvas.width() * 0.5 + textWidth * 0.5) - 25;
      }

      if (textOffset.y < -(canvas.height() * 0.5 + textHeight * 0.5) + 25) {
        textOffset.y = -(canvas.height() * 0.5 + textHeight * 0.5) + 25;
      }
      if (textOffset.y > (canvas.height() * 0.5 + textHeight * 0.5) - 25) {
        textOffset.y = (canvas.height() * 0.5 + textHeight * 0.5) - 25;
      }

      renderAllLayers();
    }else if (movesBackgroundEnabled) {
      var currentLocation = {x: event.screenX, y: event.screenY};
      backgroundOffset.x = startPosition.x - (startLocation.x - currentLocation.x);
      backgroundOffset.y = startPosition.y - (startLocation.y - currentLocation.y);

      if (backgroundOffset.x < -canvas.width() + 25) {
        backgroundOffset.x = -canvas.width() + 25;
      }
      if (backgroundOffset.x > canvas.width() - 25) {
        backgroundOffset.x = canvas.width() - 25;
      }

      if (backgroundOffset.y < -canvas.height() + 25) {
        backgroundOffset.y = -canvas.height() + 25;
      }
      if (backgroundOffset.y > canvas.height() - 25) {
        backgroundOffset.y = canvas.height() - 25;
      }

      renderAllLayers();
    }
  });

  function renderAllLayers() {
    context.clearRect(0, 0, canvas.canvasWidth, canvas.canvasHeight);
    renderBackground();
    renderText();
  }

  function renderBackground() {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, canvas.canvasWidth, canvas.canvasHeight);

    if (selectedImage == null) {
      return;
    }
    var xScale = canvas.canvasWidth / canvas.width();
    var yScale = canvas.canvasHeight / canvas.height();

    var x = backgroundOffset.x * yScale;
    var y = backgroundOffset.y * yScale;

    var boundsX = canvas.position().left + backgroundOffset.x;
    var boundsY = canvas.position().top + backgroundOffset.y;

    var canvasWidth = canvas.width();
    var canvasHeight = canvas.height();

    // var boundsWidth = (canvasWidth - Math.abs(backgroundOffset.x) - 4) + (canvasWidth * (backgroundScale - 1));
    var boundsWidth = canvasWidth * backgroundScale //- Math.abs(backgroundOffset.x) - 4;
    var boundsHeight = canvasHeight * backgroundScale //- Math.abs(backgroundOffset.y) - 4;
    // var boundsHeight = (canvasHeight - Math.abs(backgroundOffset.y) - 4) + (canvasHeight * (backgroundScale - 1));

    if (boundsX < canvas.position().left) {
      boundsWidth = boundsWidth - (Math.abs(canvas.position().left - boundsX)) - 4;
      boundsX = canvas.position().left;
    }
    if (boundsX > canvas.position().left + canvasWidth - 25) {
      // boundsX = canvas.position().left + canvasWidth - 25;
    }
    if (boundsY < canvas.position().top) {
      boundsY = canvas.position().top;
    }
    if (boundsY > canvas.position().top + canvasHeight - 25) {
      // boundsY = canvas.position().top + canvasHeight - 25;
    }
    if (boundsWidth < 21) {
      // boundsWidth = 21;
    }else if (boundsWidth > canvasWidth && boundsX + boundsWidth > canvas.position().left + canvasWidth - 4) {
      // boundsWidth = canvasWidth - Math.abs(backgroundOffset.x) - 4;
    }
    if (boundsHeight < 21) {
      // boundsHeight = 21;
    }else if (boundsHeight > - 4) {
      // boundsHeight = canvas.position().top + canvasHeight - 4 - booundY;
    }

    backgroundBounds.css("left", boundsX + "px");
    backgroundBounds.css("top", boundsY + "px");
    backgroundBounds.width(boundsWidth);
    backgroundBounds.height(boundsHeight);

    backgroundBounds.css("opacity", "0");
    context.drawImage(selectedImage, x, y, imageWidth * backgroundScale, imageHeight * backgroundScale);
  }

  function renderText() {
    updateBoundsSize();

    var x = canvas.position().left;
    x -= textBounds.width() / 2;
    x += canvas.width() / 2;

    var y = canvas.position().top;
    y -= textBounds.height() / 2;
    y += canvas.height() / 2;

    y += textOffset.y;
    x += textOffset.x;

    if (x < canvas.position().left - textBounds.width() + 25) {
      x = canvas.position().left - textBounds.width() + 25;
    }
    if (x > canvas.position().left + canvas.width() - 25) {
      x = canvas.position().left + canvas.width() - 25;
    }
    if (y < canvas.position().top - textBounds.height() + 25) {
      y = canvas.position().top - textBounds.height() + 25;
    }
    if (y > canvas.position().top + canvas.height() - 25) {
      y = canvas.position().top + canvas.height() - 25;
    }

    textBounds.css("left", x + "px");
    textBounds.css("top", y + "px");

    context.font = fontSize + 'px "' + fontName + '"';
    context.fillStyle = fontColor;
    context.textAlign = textAlign;

    wrapText(context, text);

    if (x < canvas.position().left) {
      textBounds.css("width", textBounds.width() - (canvas.position().left - x) + "px");

      x = canvas.position().left;
      textBounds.css("left", x + "px");
      textBounds.css("top", y + "px");
    }

    if (x > canvas.position().left + canvas.width() - textBounds.width()) {
      textBounds.css("width", -2 + textBounds.width() - ((textBounds.position().left + textBounds.width()) - (canvas.position().left + canvas.width())) + "px");
    }

    if (y < canvas.position().top) {
      textBounds.css("height", textBounds.height() - (canvas.position().top - y) + "px");

      y = canvas.position().top;
      textBounds.css("left", x + "px");
      textBounds.css("top", y + "px");
    }

    if (y > canvas.position().top + canvas.height() - textBounds.height()) {
      textBounds.css("height", -2 + textBounds.height() - ((textBounds.position().top + textBounds.height()) - (canvas.position().top + canvas.height())) + "px");
    }
  }

  function wrapText(context, text) {
    var lineHeight = fontHeight * 1.0
    var lines = text.split('\n');
    var numberOfLines = lines.length;

    var xScale = canvas.canvasWidth / canvas.width();
    var yScale = canvas.canvasHeight / canvas.height();

    var x = 0;
    if (textAlign == "left") {
      x = (canvas.position().left - canvas.position().left) * 0.5;
      x += textBounds.position().left;
      x -= canvas.position().left;
      x *= xScale;
    }else if (textAlign == "center") {
      x = (canvas.position().left - canvas.position().left) * 0.5;
      x += textBounds.position().left + textBounds.width() * 0.5;
      x -= canvas.position().left;
      x *= xScale;
    }else if (textAlign == "right") {
      x = (canvas.position().left - canvas.position().left) * 0.5;
      x += textBounds.position().left + textBounds.width();
      x -= canvas.position().left;
      x *= xScale;
    }

    var y = textBounds.position().top - canvas.position().top + textBounds.height()
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

    var xScale = canvas.width() / canvas.canvasWidth;
    var yScale = canvas.height() / canvas.canvasHeight;

    textWidth = tempText.width()
    fontHeight = parseInt(window.getComputedStyle(tempText.get(0)).fontSize, null);

    textBounds.width(textWidth * xScale);
    textBounds.height(fontHeight * numberOfLines * yScale);

    tempText.remove();

    textWidth = textBounds.width();
    textHeight = textBounds.height();
  }
  // Call two times for loading font IBM Logo (@font-face only)
  renderAllLayers();
  tools.animate({
    opacity: 1.0
  }, 250, function() {
    preview.animate({
      opacity: 1.0
    }, 250);
    preview.find("header").animate({
      width: canvas.width()
    }, 250, function() {
      canvas.fadeIn(500);
      renderAllLayers();
    });
  });
});
