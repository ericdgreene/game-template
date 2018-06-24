let chatText = document.getElementById("chat-text");
let chatInput = document.getElementById("chat-input");
let chatForm = document.getElementById("chat-form");

var ctx = document.getElementById("ctx").getContext("2d");
ctx.font = "30px Arial";

var socket = io();

socket.on("newPositions", function(data) {
  ctx.clearRect(0, 0, 500, 500);
  for (var i = 0; i < data.player.length; i++)
    ctx.fillText(data.player[i].num, data.player[i].x, data.player[i].y);

  for (var i = 0; i < data.bullet.length; i++)
    ctx.fillRect(data.bullet[i].x - 5, data.bullet[i].y - 5, 10, 10);
});

socket.on("addToChat", function(data) {
  chatText.innerHTML += "<div>" + data + "</div>";
});
socket.on("evalAnswer", function(data) {
  console.log(data);
});

// chatForm.onsubmit = function(e) {
//   e.preventDefault();
//   let chatVal = chatInput.value;
//   console.log(chatVal);
//   if(chatVal[0] === '/'){
//     socket.emit('evalServer',chatVal.slice(1));
//   }
//   socket.emit("sendMsgToServer", chatVal);
//   chatVal= "";
// };

chatForm.onsubmit = function(e) {
  e.preventDefault();
  if (chatInput.value[0] === "/") {
    socket.emit("evalServer", chatInput.value.slice(1));
  } else {
    socket.emit("sendMsgToServer", chatInput.value);
  }
  chatInput.value = "";
};

document.onkeydown = function(event) {
  if (event.keyCode === 68)
    //d
    socket.emit("keyPress", { inputId: "right", state: true });
  else if (event.keyCode === 83)
    //s
    socket.emit("keyPress", { inputId: "down", state: true });
  else if (event.keyCode === 65)
    //a
    socket.emit("keyPress", { inputId: "left", state: true });
  else if (event.keyCode === 87)
    // w
    socket.emit("keyPress", { inputId: "up", state: true });
};
document.onkeyup = function(event) {
  if (event.keyCode === 68)
    //d
    socket.emit("keyPress", { inputId: "right", state: false });
  else if (event.keyCode === 83)
    //s
    socket.emit("keyPress", { inputId: "down", state: false });
  else if (event.keyCode === 65)
    //a
    socket.emit("keyPress", { inputId: "left", state: false });
  else if (event.keyCode === 87)
    // w
    socket.emit("keyPress", { inputId: "up", state: false });
};
document.onmousedown = function(event) {
  socket.emit("keyPress", { inputId: "attack", state: true });
};
document.onmouseup = function(event) {
  socket.emit("keyPress", { inputId: "attack", state: false });
};

document.onmousemove = function(event) {
  let x = -250 + event.clientX - 8;
  let y = -250 + event.clientY - 8;
  let angle = (Math.atan2(y, x) / Math.PI) * 180;
  socket.emit("keyPress", { inputId: "mouseAngle", state: angle });
};
