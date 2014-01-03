
$(document).ready(function() {
  var socket = io.connect();
  // socket.set('log level', 3);

  socket.on('connect', function() {
    console.log('connect');
    $("#status").html("CONNECTED");
    $("#result").empty();
  });

  socket.on('line', function(data) {
    // $("#result").prepend("<h3>Message is received</h3>");
    // $("#result").prepend("<p>"+data+"</p>");
    console.log("msg");
    console.log(data);
    var msg = data.msg;
    if (msg === "") msg = "&nbsp;";
    else msg = msg
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/ /g, "&nbsp;")
            .replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;")
            .replace(/{{{/g, "<span class='matched'>")
            .replace(/}}}/g, "</span>")
            ;
    $("#result").append("<p class='line'><span class='lineno'>"+data.lineno+"</span><span class='txt'>"+msg+"</span></p>");
    $("#result").scrollTop($("#result")[0].scrollHeight);
  });

  socket.on('disconnect', function() {
    $("#status").html("DISCONNECTED");
    socket.disconnect();
  });

  socket.on('error', function (data) {
    $("#status").html(data || 'error');
  });

  socket.on('connect_failed', function (data) {
    $("#status").html(data || 'connect_failed');
  });

  $("#execute").click( function (e) {
    $("#result").empty();
    e.preventDefault();
    // socket = io.reconnect();
    var options = {};
    options.tail = {};
    options.tail.filename = $("#options input[name='tail.filename']").val();
    $("#filename").html(options.tail.filename);
    options.tail.line = $("#options input[name='tail.line']").val();
    options.tail.options = [];
    $("#options input[name='tail.option']:checked").each(function() {
      options.tail.options[options.tail.options.length] = $(this).val();
    });
    if ($("#options input[name='grep']:checked").val() === "Y") {
      options.grep = {};
      options.grep.options = [];
      $("#options input[name='grep.option']:checked").each(function() {
        options.grep.options[options.grep.options.length] = $(this).val();
      });
      options.grep.regex = $("#options input[name='grep.regex']").val();
    }
    console.log(options);
    socket.emit('tailgrep', options);
    return false;
  });

});


