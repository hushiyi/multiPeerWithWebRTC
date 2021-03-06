'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
io.sockets.on('connection', function(socket) {

  // convenience function to log server messages on the client
  function log() {
    var array = ['来自服务器的消息  :'];
    array.push.apply(array, arguments);
    socket.emit('log', array);
  }

  socket.on('message', function(message,clientAnwerId,clientOfferId) {
    log('客户端说    : ', message);
     var anwerId
     var offerId 
    // for a real app, would be room-only (not broadcast)
    // socket.broadcast.emit('message', message);
    // socket.emit('message', message);
      anwerId = anwerId || clientAnwerId
      offerId = offerId || clientOfferId
    if (message.type == "offer") {
      message.offerId = offerId
    };
    log('---- anwerId:'+anwerId+"---offerId:"+offerId+" ------ message.type: "+message.type)
    if (anwerId) {
        log(" 有传入id")
          socket.to(anwerId).emit('message', message);
    }else{
        log(" 没有传入id")
        socket.broadcast.emit('message', message);
    }
  });

  socket.on('create or join', function(room) {
    log('收到创建房间请求 ' + room);

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;
    log('Room ' + room + ' now has ' + numClients + ' client(s)');

    if (numClients === 0) {
      socket.join(room);
      log('客户 ID ' + socket.id + ' 创建房间 ' + room);
      socket.emit('created', socket.id);

    } else if (numClients < 10) {
      // log('客户 ID ' + socket.id + ' 进入房间 ' + room);
      // io.sockets.in(room).emit('join',socket.id);  //除了新加入的人，其他人能收到信息
      // socket.join(room);
      // socket.emit('joined room', room, socket.id); //只能自己看到
      // io.sockets.in(room).emit('ready'); 
       log('客户 ID ' + socket.id + ' 进入房间 ' + room);
      io.sockets.in(room).emit('join', socket.id);
      socket.join(room);
      socket.emit('joined',room,socket.id,numClients);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
