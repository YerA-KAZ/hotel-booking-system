const http = require('http');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const url = require('url');

// EventEmitter класын кеңейту
class BookingEmitter extends EventEmitter {}
const bookingEvents = new BookingEmitter();

// Деректер файлының жолы
const DATA_FILE = path.join(__dirname, 'data', 'bookings.json');

// Деректерді оқу
function readBookings() {
    try {
        if (!fs.existsSync(DATA_FILE)) {
            return [];
        }
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        bookingEvents.emit('error', 'Деректерді оқу қатесі', error);
        return [];
    }
}

// Деректерді жазу
function writeBookings(bookings) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(bookings, null, 2));
        bookingEvents.emit('dataSaved', bookings.length);
    } catch (error) {
        bookingEvents.emit('error', 'Деректерді жазу қатесі', error);
    }
}

// EventEmitter оқиғалары
bookingEvents.on('bookingCreated', (booking) => {
    console.log(`[${new Date().toISOString()}] Жаңа брондау: ${booking.name} - ${booking.roomType}`);
    logToFile('bookingCreated', booking);
});

bookingEvents.on('bookingCancelled', (bookingId) => {
    console.log(`[${new Date().toISOString()}] Брондау өшірілді: ID ${bookingId}`);
    logToFile('bookingCancelled', { id: bookingId });
});

bookingEvents.on('dataSaved', (count) => {
    console.log(`[${new Date().toISOString()}] Деректер сақталды. Барлығы: ${count} брондау`);
});

bookingEvents.on('error', (message, error) => {
    console.error(`[${new Date().toISOString()}] ҚАТЕ: ${message}`, error);
    logToFile('error', { message, error: error.message });
});

bookingEvents.on('apiRequest', (method, endpoint) => {
    console.log(`[${new Date().toISOString()}] API сұраныс: ${method} ${endpoint}`);
});

// Логты файлға жазу
function logToFile(eventType, data) {
    const logEntry = `[${new Date().toISOString()}] ${eventType}: ${JSON.stringify(data)}\n`;
    fs.appendFileSync(path.join(__dirname, 'server.log'), logEntry);
}

// Статикалық файлдарды жіберу
function serveStaticFile(res, filePath, contentType) {
    fs.readFile(filePath, (err, content) => {
        if (err) {
            bookingEvents.emit('error', 'Файл оқу қатесі', err);
            res.writeHead(500);
            res.end('Server Error');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// HTTP серверін құру
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    const pathname = parsedUrl.pathname;

    // CORS заголовоктары
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // OPTIONS сұранысын өңдеу
    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // API оқиғасын тіркеу
    bookingEvents.emit('apiRequest', method, pathname);

    // Маршруттарды өңдеу
    if (pathname === '/api/bookings' && method === 'GET') {
        // Барлық брондауларды алу
        const bookings = readBookings();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(bookings));

    } else if (pathname === '/api/bookings' && method === 'POST') {
        // Жаңа брондау қосу
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const newBooking = JSON.parse(body);
                const bookings = readBookings();
                
                // ID генерациялау
                newBooking.id = Date.now().toString();
                newBooking.createdAt = new Date().toISOString();
                
                bookings.push(newBooking);
                writeBookings(bookings);
                
                bookingEvents.emit('bookingCreated', newBooking);
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(newBooking));
            } catch (error) {
                bookingEvents.emit('error', 'Брондау қосу қатесі', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Қате деректер' }));
            }
        });

    } else if (pathname.startsWith('/api/bookings/') && method === 'DELETE') {
        // Брондауды өшіру
        const id = pathname.split('/')[3];
        const bookings = readBookings();
        const filteredBookings = bookings.filter(b => b.id !== id);
        
        if (bookings.length !== filteredBookings.length) {
            writeBookings(filteredBookings);
            bookingEvents.emit('bookingCancelled', id);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ message: 'Брондау өшірілді' }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Брондау табылмады' }));
        }

    } else if (pathname === '/api/stats' && method === 'GET') {
        // Статистика
        const bookings = readBookings();
        const stats = {
            total: bookings.length,
            byRoomType: bookings.reduce((acc, curr) => {
                acc[curr.roomType] = (acc[curr.roomType] || 0) + 1;
                return acc;
            }, {})
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(stats));

    } else if (pathname === '/' || pathname === '/index.html') {
        // HTML файлын жіберу
        serveStaticFile(res, path.join(__dirname, 'public', 'index.html'), 'text/html');
    } else if (pathname === '/style.css') {
        serveStaticFile(res, path.join(__dirname, 'public', 'style.css'), 'text/css');
    } else if (pathname === '/script.js') {
        serveStaticFile(res, path.join(__dirname, 'public', 'script.js'), 'application/javascript');
    } else {
        // 404 Not Found
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Маршрут табылмады' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Сервер http://localhost:${PORT} портында іске қосылды`);
    bookingEvents.emit('serverStarted', PORT);
});