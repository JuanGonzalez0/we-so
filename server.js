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
  res.render("index", { titulo: "inicio EJS" });
});

app.get("/nosotros", (req, res) => {
  res.render("nosotros", { titulo: "Nosotros EJS" });
});

app.use((req, res, next) => {
  res.status(404).render("404", { titulo: "Página 404" });
});



// Servir archivos estáticos desde el directorio 'public'
app.use(express.static('public'));


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

// Redirigir a subirArchivo.html (opcional, si necesitas una ruta específica)
app.get('/subir', (req, res) => {
    res.redirect('/subirArchivos.html');
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

// Middleware para servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ruta para subir archivos
app.post('/upload', upload.single('file'), (req, res) => {
  let volver = '<h2><a href=/index.html>volver a la pagina principal</a></>';
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
    let volver = '<h2><a href=/index.html>volver a la pagina principal</a></>';
    res.send(fileListHtml + volver);
  });
});

app.get('/salas', (req, res) => {
  res.redirect('/salas.html');
});

const rooms = {
  deportes: new Set(),
  juegos: new Set(),
  cocina: new Set(),
};

wss.on('connection', (ws) => {
  let currentRoom = null;

  ws.on('message', (message) => {
    const msg = JSON.parse(message);


    if (msg.type === 'join') {
      const room = msg.room;
      if (rooms[room]) {
        if (currentRoom) {
          rooms[currentRoom].delete(ws);
        }
        rooms[room].add(ws);
        currentRoom = room;

        rooms[room].forEach(client => {
          if (client !== ws) {
            client.send(JSON.stringify({ type: 'message', text: `A new user has joined the ${room} room.` }));
          }
        });
      } else {
        ws.send(JSON.stringify({ type: 'error', text: 'Room does not exist' }));
      }
    } else if (msg.type === 'message') {
      if (currentRoom) {
        rooms[currentRoom].forEach(client => {
          if (client !== ws) {
            client.send(JSON.stringify({ type: 'message', text: msg.text }));
          }
        });
      }
    }
  });

  ws.on('close', () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].delete(ws);
      if (rooms[currentRoom].size === 0) {
        delete rooms[currentRoom];
      }
    }
  });
});

// Iniciar el servidor en el puerto 3000
server.listen(3000, () => {
    console.log('HTTP Server and WebSocket server are listening on port 3000');
});
