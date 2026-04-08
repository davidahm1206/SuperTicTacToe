/* ═══════════════════════════════════════════════
   HUB MENU LOGIC
   ═══════════════════════════════════════════════ */

const cards = document.querySelectorAll('.game-card');

// Helper to update mouse coordinates for glow effect
cards.forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    });
});

// Tilt Effect
cards.forEach(card => {
    card.addEventListener('mousemove', e => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        const multiplier = 10;
        const rotateX = (y / rect.height) * -multiplier;
        const rotateY = (x / rect.width) * multiplier;
        
        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });

    card.addEventListener('mouseleave', () => {
        card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
        // Reset tilt transition smoothly
        card.style.transition = 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        setTimeout(() => card.style.transition = 'transform 0.1s', 400); 
    });
});

// Partikel System
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');

let width, height;
let particles = [];

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
}

window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.x = Math.random() * width;
        this.y = height + Math.random() * 200; // Start slightly below screen
        this.size = Math.random() * 2 + 0.5;
        this.speedy = Math.random() * 0.5 + 0.2;
        this.speedx = (Math.random() - 0.5) * 0.5;
        this.life = Math.random() * 0.5 + 0.2;
        this.colorStr = Math.random() > 0.5 ? '6, 182, 212' : '236, 72, 153'; // Cyan or Pink
    }
    
    update() {
        this.y -= this.speedy;
        this.x += this.speedx;
        
        // Add some random sway
        this.speedx += (Math.random() - 0.5) * 0.02;
        
        if (this.y < -10 || this.x < -10 || this.x > width + 10) {
            this.reset();
        }
    }
    
    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.colorStr}, ${this.life})`;
        ctx.fill();
        
        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = `rgba(${this.colorStr}, 1)`;
    }
}

// Initialize particles
for (let i = 0; i < 50; i++) {
    particles.push(new Particle());
    // Randomize initial positions over the screen
    particles[i].y = Math.random() * height;
}

function animate() {
    ctx.clearRect(0, 0, width, height);
    
    particles.forEach(p => {
        p.update();
        p.draw();
    });
    
    // Reset shadow state
    ctx.shadowBlur = 0;
    
    requestAnimationFrame(animate);
}

animate();
