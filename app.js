let DEBUG = false;

let USERS = {
  bob: "asdf",
  eric: "eric",
  forrest: "123"
};

let isLoginValid = function (data, callback) {
  db.account.find({
      username: data.username,
      password: data.password
    },
    function (err, res) {
      console.log(`callback: ${res.length}`);
      return callback ? res.length > 0 : (res.length = 0);
      // console.log(callback);
      // if (res.length > 0) {
      //   callback(true);
      // } else {
      //   callback(false);
      // }
    }
  );
};
let isUsernameTaken = function (data, callback) {
  db.account.find({
    username: data.username
  }, function (err, res) {
    return callback ? res.length > 0 : (res.length = 0);
  });
};
let addUser = function (data, callback) {
  db.account.insert({
      username: data.username,
      password: data.password
    },
    function (err) {
      // no result for an insertion, so just callback
      callback();
    }
  );
};
const mongojs = require("mongojs");
const db = mongojs("localhost:27017/myGame", ["account", "progress"]);

const express = require("express");
const app = express();
const server = require("http").Server(app);
const port = 5050;

app.get("/", function (req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

server.listen(port);
const dateNow = new Date();
const timeServerStarted = dateNow.toDateString();
const serverStartMsg = `express server started ${timeServerStarted} on port ${port}`;

console.log(serverStartMsg);

const SOCKET_LIST = {};
// const PLAYER_LIST = {};

// Entity is super class of both player and bullet
let Entity = function () {
  let self = {
    x: 250,
    y: 250,
    xSpeed: 0,
    ySpeed: 0,
    id: ""
  };
  self.update = function () {
    self.updatePosition();
  };
  self.updatePosition = function () {
    self.x += self.xSpeed;
    self.y += self.ySpeed;
  };
  self.getDistance = function (pt) {
    return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
  };
  return self;
};

let Player = function (id) {
  let self = Entity();
  self.id = id;
  self.number = Math.floor(10 * Math.random());
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.maxSpeed = 10;
  self.pressingAttack = false;
  self.mouseAngle = 0;

  let super_update = self.update;
  self.update = function () {
    self.updateSpeed();
    super_update();

    if (self.pressingAttack) {
      for (let i = -3; i < 3; i++) {
        self.shootBullet(i * 10 + self.mouseAngle);
      }
    }
  };
  self.shootBullet = function (angle) {
    // console.log(`angle: ${angle}`);
    let b = Bullet(self.id, angle);
    b.x = self.x;
    b.y = self.y;
  };

  self.updateSpeed = function () {
    if (self.pressingRight) {
      self.xSpeed = self.maxSpeed;
    } else if (self.pressingLeft) {
      self.xSpeed = -self.maxSpeed;
    } else {
      self.xSpeed = 0;
    }
    if (self.pressingUp) {
      self.ySpeed = -self.maxSpeed;
    } else if (self.pressingDown) {
      self.ySpeed = self.maxSpeed;
    } else {
      self.ySpeed = 0;
    }
  };
  self.getInitPackage = function () {
    return {
      id: self.id,
      x: self.x,
      y: self.y,
      num: self.num
    }
  };
  self.getUpdatePackage = function () {
    return {
      id: player.id,
      x: player.x,
      y: player.y
    }
  }
  Player.list[id] = self;
  initPackage.player.push(self.getInitPackage());
  return self;
};

Player.list = {};
Player.onConnect = function (socket) {
  let player = Player(socket.id);
  // console.log(player);
  socket.on("keyPress", function (data) {
    // console.log(`data: ${data}`);
    if (data.inputId == "left") {
      player.pressingLeft = data.state;
    } else if (data.inputId == "right") {
      player.pressingRight = data.state;
    } else if (data.inputId == "down") {
      player.pressingDown = data.state;
    } else if (data.inputId == "up") {
      player.pressingUp = data.state;
    } else if (data.inputId == "attack") {
      player.pressingAttack = data.state;
    } else if (data.inputId == "mouseAngle") {
      player.mouseAngle = data.state;
    }
  });
};
Player.onDisconnect = function (socket) {
  delete Player.list[socket.id];
  removePackage.player.push(socket.id);
};
Player.update = function () {
  const dataPackage = [];
  for (let i in Player.list) {
    let player = Player.list[i];
    player.update();
    dataPackage.push(self.getUpdatePackage());
  }
  return dataPackage;
};

let Bullet = function (parent, angle) {
  var self = Entity();
  self.id = Math.random();
  self.xSpeed = Math.cos((angle / 180) * Math.PI) * 10;
  self.ySpeed = Math.sin((angle / 180) * Math.PI) * 10;
  self.parent = parent;

  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function () {
    if (self.timer++ > 100) {
      self.toRemove = true;
    }
    super_update();
    for (let i in Player.list) {
      // test for player collision
      let p = Player.list[i];
      if (self.getDistance(p) < 32 && self.parent !== p.id) {
        // handle a collision here
        self.toRemove = true;
      }
    }
  };
  Bullet.list[self.id] = self;
  initPackage.bullet.push({
    id: self.id,
    x: self.x,
    y: self.y
  });
  return self;
};
Bullet.list = {};

Bullet.update = function () {
  const dataPackage = [];
  for (let i in Bullet.list) {
    let bullet = Bullet.list[i];
    bullet.update();
    if (bullet.toRemove) {
      delete Bullet.list[i];
      removePackage.bullet.push(bullet.id);
    } else {
      dataPackage.push({
        id: bullet.id,
        x: bullet.x,
        y: bullet.y
      });
    }
  }
  return dataPackage;
};

const io = require("socket.io")(server, {});
io.sockets.on("connection", function (socket) {
  socket.id = Math.random(); // assign each socket connection a unique ID
  SOCKET_LIST[socket.id] = socket; // add it to the list of players

  socket.on("login", function (data) {
    isLoginValid(data, function (res) {
      // console.log(data);
      if (res) {
        socket.emit("loginResponse", {
          success: true
        });
        Player.onConnect(socket);
      } else {
        socket.emit("loginResponse", {
          success: false
        });
      }
    });
  });
  socket.on("register", function (data) {
    isUsernameTaken(data, function (res) {
      if (res) {
        socket.emit("registerResponse", {
          success: false
        });
      } else {
        addUser(data, function () {
          socket.emit("registerResponse", {
            success: true
          });
        });
      }
    });
  });
  socket.on("disconnect", function () {
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  socket.on("clientMsg", function (data) {
    console.log(
      "Message from Client: " + data.message + " Number: " + data.number
    );
  });
  socket.on("sendMsgToServer", function (data) {
    let playerName = ("" + socket.id).slice(2, 7);
    for (let i in SOCKET_LIST) {
      SOCKET_LIST[i].emit("addToChat", playerName + ": " + data);
    }
  });
  socket.on("evalServer", function (data) {
    if (!DEBUG) {
      return;
    }
    let result = "";
    try {
      result = eval(data);
    } catch (e) {
      if (e instanceof ReferenceError) {
        result = e;
      }
    }
    socket.emit("evalAnswer", `${result}`);
  });
});

let initPackage = {
  player: [],
  bullet: []
};
let removePackage = {
  player: [],
  bullet: []
};

setInterval(function () {
  const dataPackage = {
    player: Player.update(),
    bullet: Bullet.update()
  };

  for (let i in SOCKET_LIST) {
    let socket = SOCKET_LIST[i];
    socket.emit("init", initPackage);
    socket.emit("update", dataPackage);
    socket.emit("remove", removePackage);
  }
  // empty the init and remove packages each frame
  initPackage.player = {};
  initPackage.bullet = {};
  removePackage.player = {};
  removePackage.bullet = {};
}, 1000 / 25);