const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const express = require('express');
const multer = require('multer');
const path = require('path');
const ejs = require('ejs')

const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

app.get("/", (req, res) => {
  res.render("index");
});

// Crear servidor HTTP utilizando express
const server = http.createServer(app);

// Crear servidor WebSocket y vincularlo al servidor HTTP
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('New client connected');

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });

    ws.send('Welcome to the WebSocket server!');
});

app.get("/subirArchivos", (req, res) => {
  res.render("subirArchivos");
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, file.originalname);
    }
  });

const upload = multer({ storage: storage });


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  let volver = '<h2><a href="/">volver a la pagina principal</a></>';
  res.send('Archivo subido exitosamente' + volver);
});

// Ruta para listar y descargar archivos
app.get('/files', (req, res) => {
  fs.readdir(path.join(__dirname, 'uploads'), (err, files) => {
    if (err) {
      return res.status(500).send('Error al leer la carpeta de archivos');
    }

    let fileListHtml = '<h1>Archivos disponibles para descargar</h1><ul>';
    files.forEach(file => {
      fileListHtml += `<li><a href="/uploads/${file}" download>${file}</a></li>`;
    });
    fileListHtml += '</ul>';
    let volver = '<h2><a href="/">volver a la pagina principal</a></>';
    res.send(fileListHtml + volver);
  });
});

const rooms = {
  'sala1': [],
  'sala2': [],
  'sala3': []
};

app.get("/salas", (req, res) => {
  res.render("salas", { rooms: rooms });
});

wss.on('connection', (ws) => {
  let userRoom;

  ws.on('message', (message) => {
    message = message.toString(); // Convertir el mensaje a cadena de texto

    if (message.startsWith('join')) {
      userRoom = message.split(' ')[1];
      rooms[userRoom].push(ws);
      console.log(`Cliente unido a la sala ${userRoom}`);
    } else if (message.startsWith('message')) {
      const messageContent = message.split(' ')[1];
      rooms[userRoom].forEach((client) => {
        if (client.readyState === WebSocket.OPEN && client !== ws) {
          client.send(messageContent);
        }
      });
    }
  });

  ws.on('close', () => {
    if (userRoom) {
      rooms[userRoom] = rooms[userRoom].filter((client) => client !== ws);
    }
  });
});

// Iniciar el servidor en el puerto 3000
server.listen(3000, () => {
    console.log('HTTP Server and WebSocket server are listening on port 3000');
});
