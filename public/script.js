// API базалық URL
const API_URL = 'http://localhost:3000/api';

// DOM элементтері
const bookingForm = document.getElementById('bookingForm');
const bookingsList = document.getElementById('bookingsList');
const statsDiv = document.getElementById('stats');
const messageDiv = document.getElementById('message');
const clearFormBtn = document.getElementById('clearFormBtn');

// Бет жүктелгенде брондауларды жүктеу
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    loadStats();
    setupRealTimeValidation();
});

// Хабарлама көрсету
function showMessage(text, type = 'info') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 3000);
}

// Брондауларды жүктеу
async function loadBookings() {
    try {
        bookingsList.innerHTML = '<div class="loading">Брондаулар жүктелуде...</div>';
        
        const response = await fetch(`${API_URL}/bookings`);
        
        if (!response.ok) {
            throw new Error(`Сервер қатесі: ${response.status}`);
        }
        
        const bookings = await response.json();
        displayBookings(bookings);
    } catch (error) {
        console.error('Қате:', error);
        showMessage('Брондауларды жүктеу қатесі: ' + error.message, 'error');
        bookingsList.innerHTML = '<div class="error-message">Қате орын алды. Серверді тексеріңіз.</div>';
    }
}

// Статистиканы жүктеу
async function loadStats() {
    try {
        const response = await fetch(`${API_URL}/stats`);
        
        if (!response.ok) {
            throw new Error(`Сервер қатесі: ${response.status}`);
        }
        
        const stats = await response.json();
        displayStats(stats);
    } catch (error) {
        console.error('Қате:', error);
        statsDiv.innerHTML = '<div class="error-message">Статистика жүктелмеді</div>';
    }
}

// Статистиканы көрсету
function displayStats(stats) {
    let statsHtml = '';
    
    // Жалпы саны
    statsHtml += `
        <div class="stat-card">
            <span class="stat-icon">📊</span>
            <div class="stat-value">${stats.total || 0}</div>
            <div class="stat-label">Барлық брондау</div>
        </div>
    `;
    
    // Бөлме түрлері бойынша
    if (stats.byRoomType) {
        const roomTypes = [
            { key: 'standard', icon: '🏨', label: 'Стандарт' },
            { key: 'lux', icon: '⭐', label: 'Люкс' },
            { key: 'family', icon: '👨‍👩‍👧‍👦', label: 'Отбасылық' }
        ];
        
        roomTypes.forEach(room => {
            if (stats.byRoomType[room.key]) {
                statsHtml += `
                    <div class="stat-card">
                        <span class="stat-icon">${room.icon}</span>
                        <div class="stat-value">${stats.byRoomType[room.key]}</div>
                        <div class="stat-label">${room.label}</div>
                    </div>
                `;
            }
        });
    }
    
    statsDiv.innerHTML = statsHtml;
}

// Брондауларды көрсету
function displayBookings(bookings) {
    if (bookings.length === 0) {
        bookingsList.innerHTML = '<div class="empty-state">Брондаулар жоқ. Жаңа брондау қосыңыз.</div>';
        return;
    }

    // Брондауларды күні бойынша сұрыптау (ең жаңасы бірінші)
    const sortedBookings = [...bookings].sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
    );

    bookingsList.innerHTML = sortedBookings.map(booking => {
        const roomClass = getRoomTypeClass(booking.roomType);
        const roomIcon = getRoomTypeIcon(booking.roomType);
        const roomName = getRoomTypeName(booking.roomType);
        const createdDate = new Date(booking.createdAt).toLocaleDateString('kk-KZ');
        
        return `
        <div class="booking-card" data-id="${booking.id}" data-room="${booking.roomType}">
            <div class="booking-header">
                <span class="booking-name">${escapeHtml(booking.name)}</span>
                <span class="booking-room ${roomClass}">${roomIcon} ${roomName}</span>
            </div>
            
            <div class="booking-details">
                <div class="booking-detail-item">
                    <i class="fas fa-envelope"></i>
                    <span>${escapeHtml(booking.email)}</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-phone"></i>
                    <span>${escapeHtml(booking.phone)}</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-users"></i>
                    <span>${booking.guests} қонақ</span>
                </div>
                <div class="booking-detail-item">
                    <i class="fas fa-clock"></i>
                    <span>${createdDate}</span>
                </div>
            </div>
            
            <div class="booking-dates">
                <div class="date-item">
                    <i class="fas fa-calendar-check"></i>
                    <span>Кіру: ${formatDate(booking.checkIn)}</span>
                </div>
                <div class="date-item">
                    <i class="fas fa-calendar-times"></i>
                    <span>Шығу: ${formatDate(booking.checkOut)}</span>
                </div>
            </div>
            
            <div class="booking-footer">
                <span class="booking-id">ID: ${booking.id.slice(-8)}</span>
                <button onclick="cancelBooking('${booking.id}')" class="btn-danger">
                    <i class="fas fa-times-circle"></i>
                    Болдырмау
                </button>
            </div>
        </div>
    `}).join('');
}

// Бөлме түрінің класын алу
function getRoomTypeClass(type) {
    const classes = {
        'standard': 'standard',
        'lux': 'lux',
        'family': 'family'
    };
    return classes[type] || 'standard';
}

// Бөлме түрінің иконкасын алу
function getRoomTypeIcon(type) {
    const icons = {
        'standard': '🏨',
        'lux': '⭐',
        'family': '👨‍👩‍👧‍👦'
    };
    return icons[type] || '🏨';
}

// Бөлме түрінің атауын алу
function getRoomTypeName(type) {
    const names = {
        'standard': 'Стандарт',
        'lux': 'Люкс',
        'family': 'Отбасылық'
    };
    return names[type] || type;
}

// Күнді форматтау
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('kk-KZ', options);
}

// HTML экранирование
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Валидация (реалды уақытта)
function setupRealTimeValidation() {
    const phoneInput = document.getElementById('phone');
    const emailInput = document.getElementById('email');
    const checkInInput = document.getElementById('checkIn');
    const checkOutInput = document.getElementById('checkOut');

    phoneInput.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length > 0) {
            if (value.length > 12) value = value.slice(0, 12);
            // +7 (700) 123-45-67 форматы
            if (value.length > 0) {
                let formatted = '+7';
                if (value.length > 1) {
                    formatted += ' (' + value.slice(1, 4);
                    if (value.length >= 4) {
                        formatted += ') ' + value.slice(4, 7);
                        if (value.length >= 7) {
                            formatted += '-' + value.slice(7, 9);
                            if (value.length >= 9) {
                                formatted += '-' + value.slice(9, 11);
                            }
                        }
                    }
                }
                e.target.value = formatted;
            }
        }
    });

    emailInput.addEventListener('blur', (e) => {
        const email = e.target.value;
        if (email && !isValidEmail(email)) {
            showMessage('Жарамды email енгізіңіз', 'error');
        }
    });

    checkInInput.addEventListener('change', validateDates);
    checkOutInput.addEventListener('change', validateDates);
}

// Email валидация
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Күндерді тексеру
function validateDates() {
    const checkIn = document.getElementById('checkIn').value;
    const checkOut = document.getElementById('checkOut').value;
    
    if (checkIn && checkOut) {
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);
        
        if (checkOutDate <= checkInDate) {
            showMessage('Шығу күні кіру күнінен кейін болуы керек', 'error');
            return false;
        }
        
        // Ең аз түн санын тексеру
        const nights = Math.ceil((checkOutDate - checkInDate) / (1000 * 60 * 60 * 24));
        if (nights < 1) {
            showMessage('Кемінде 1 түн болуы керек', 'error');
            return false;
        }
    }
    return true;
}

// Жаңа брондау қосу
bookingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Форма деректерін жинау
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        roomType: document.getElementById('roomType').value,
        checkIn: document.getElementById('checkIn').value,
        checkOut: document.getElementById('checkOut').value,
        guests: parseInt(document.getElementById('guests').value)
    };
    
    // Валидация
    if (!validateForm(formData)) {
        return;
    }
    
    // Жүктеу индикаторы
    const submitBtn = bookingForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Жүктелуде...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Сервер қатесі');
        }
        
        const newBooking = await response.json();
        
        showMessage('✅ Брондау сәтті қосылды!', 'success');
        bookingForm.reset();
        setDefaultDates();
        
        // Тізімді жаңарту
        await loadBookings();
        await loadStats();
        
    } catch (error) {
        console.error('Қате:', error);
        showMessage('❌ Брондау қосу қатесі: ' + error.message, 'error');
    } finally {
        // Батырманы қалпына келтіру
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
});

// Форманы тексеру
function validateForm(formData) {
    if (!formData.name || formData.name.length < 2) {
        showMessage('Аты-жөніңізді толық енгізіңіз', 'error');
        return false;
    }
    
    if (!formData.email || !isValidEmail(formData.email)) {
        showMessage('Жарамды email енгізіңіз', 'error');
        return false;
    }
    
    if (!formData.phone || formData.phone.replace(/\D/g, '').length < 11) {
        showMessage('Телефон нөмірін толық енгізіңіз', 'error');
        return false;
    }
    
    if (!formData.roomType) {
        showMessage('Бөлме түрін таңдаңыз', 'error');
        return false;
    }
    
    if (!formData.checkIn || !formData.checkOut) {
        showMessage('Күндерді толық енгізіңіз', 'error');
        return false;
    }
    
    if (!validateDates()) {
        return false;
    }
    
    if (formData.guests < 1 || formData.guests > 6) {
        showMessage('Қонақтар саны 1-6 аралығында болуы керек', 'error');
        return false;
    }
    
    return true;
}

// Брондауды болдырмау
async function cancelBooking(id) {
    if (!confirm('Бұл брондауды болдырмағыңыз келе ме?')) {
        return;
    }
    
    // Жүктеу индикаторы
    const button = event.target.closest('button');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    button.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/bookings/${id}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Сервер қатесі');
        }
        
        showMessage('✅ Брондау сәтті болдырылмады', 'success');
        
        // Тізімді жаңарту
        await loadBookings();
        await loadStats();
        
    } catch (error) {
        console.error('Қате:', error);
        showMessage('❌ Брондауды болдырмау қатесі: ' + error.message, 'error');
    } finally {
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Форманы тазалау
clearFormBtn.addEventListener('click', () => {
    if (confirm('Форманы тазалағыңыз келе ме?')) {
        bookingForm.reset();
        setDefaultDates();
        showMessage('Форма тазаланды', 'info');
    }
});

// Күндерді бастапқы мәндермен толтыру
function setDefaultDates() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDateInput = (date) => {
        return date.toISOString().split('T')[0];
    };
    
    document.getElementById('checkIn').value = formatDateInput(today);
    document.getElementById('checkOut').value = formatDateInput(tomorrow);
}

// Бастапқы күндерді орнату
setDefaultDates();

// Қосымша: Клавиатура арқылы жұмыс
document.addEventListener('keydown', (e) => {
    // Ctrl + Enter - форманы жіберу
    if (e.ctrlKey && e.key === 'Enter') {
        bookingForm.dispatchEvent(new Event('submit'));
    }
    
    // Escape - форманы тазалау
    if (e.key === 'Escape' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT') {
        clearFormBtn.click();
    }
});