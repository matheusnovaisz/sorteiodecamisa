var app = require('express')();
var http = require('http').createServer(app);
var io = require('socket.io')(http);

const maxTimer = 60;
let timer = maxTimer;

let listas = {}

function cronometro() {
  timer--;

  if (timer <= 0) {
    timer = maxTimer;

    const ganhadores = escolherGanhadores();

    listas = {};

    for (const sala in ganhadores) {
      io.to(sala).emit("ganhador", {
        ganhador: ganhadores[sala],
      });
      io.to(sala).emit("lista", {lista: listas[sala]});
    }

    clearInterval(relogio);
    relogio = null;

    io.emit("cronometro", {
      segundos: -1,
    });
  }
  else {
    io.emit("cronometro", {
      segundos: timer,
    });
  }
  
}

let relogio = null;

function escolherGanhadores() {
  const ganhadores = {};
  for (const sala in listas) {
    const lista = listas[sala];

    const ganhador = lista[Math.floor(Math.random() * lista.length)];
    ganhadores[sala] = ganhador;

    console.log (ganhador.nome + " ganhou a camisa " + sala);
  }

  return ganhadores;
}

function removerDuplicados(data) {
  for (const sala in listas) {
    console.log(data.nome + " (duplicado) foi removido da lista " + data.sala);
    listas[sala] = listas[sala].filter(item => item.id != data.id);
  }
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log("Nova conexão");

  socket.on("entrar", (data) => {

    if (!relogio) relogio = setInterval(cronometro, 1000);

    data.id = socket.id;

    removerDuplicados(data);

    socket.on("disconnect", () => {
      removerDuplicados(data);
    });

    console.log(data.nome + " está concorrendo (camisa " + data.sala + ")");

    socket.join(data.sala);

    if (!listas[data.sala]) listas[data.sala] = [];
    const lista = listas[data.sala];

    lista.push(data);

    socket.emit("eu", data);
    socket.emit("lista", {lista: lista});
    socket.to(data.sala).emit("lista", {lista: lista});
  })
});

http.listen(3000, () => {
  console.log("Porta *:3000");
});