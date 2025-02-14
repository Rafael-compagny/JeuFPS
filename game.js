// Initialisation de la scène et du moteur de rendu
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
document.getElementById("about-btn").addEventListener("click", function() {
    window.location.href = "a_propos.html";
});
document.getElementById("commande-btn").addEventListener("click", function() {
    window.location.href = "acceuil.html";
});

// Création de la scène et de la caméra
camera.position.set(0, 1.6, 0); // Hauteur du joueur

// Activer le Pointer Lock pour capturer la souris
document.body.addEventListener("click", function () {
    document.body.requestPointerLock();
});

// Écouter les mouvements de la souris pour tourner la caméra
let rotationX = 0;
let rotationY = 0;

document.addEventListener("mousemove", function (event) {
    if (document.pointerLockElement === document.body) {
        const sensitivity = 0.002; // Sensibilité de la souris
        rotationX -= event.movementY * sensitivity;
        rotationY -= event.movementX * sensitivity;
        
        // Limiter l'angle de vision verticale pour éviter les retournements
        rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotationX));

        camera.rotation.x = rotationX;
        camera.rotation.y = rotationY;
    }
});


// Variables du jeu
let health = 100;
let currentLevel = 1;
let targetsPerLevel = 5;
let enemiesToSpawn = 3;
let bullets = [];
let targets = [];
let enemies = [];
let isPaused = false;
let gameActive = true;

// UI Elements
const healthValue = document.getElementById('health-value');
const levelValue = document.getElementById('level-value');
const remainingValue = document.getElementById('remaining-value');

// Lumières
const light = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

// Sol
const floorGeometry = new THREE.PlaneGeometry(50, 50);
const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);



// Déplacement du joueur
const playerSpeed = 0.2;
const keys = { z: false, s: false, q: false, d: false };

document.addEventListener('keydown', (event) => {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
    }
});

document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
});

function movePlayer() {
    if (keys.z) camera.position.z -= playerSpeed;
    if (keys.s) camera.position.z += playerSpeed;
    if (keys.q) camera.position.x -= playerSpeed;
    if (keys.d) camera.position.x += playerSpeed;
}

// Génération des cibles
function generateTargets(count) {
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ffe4 });
        const target = new THREE.Mesh(geometry, material);
        target.position.set((Math.random() - 0.5) * 20, 1, (Math.random() - 0.5) * 20);
        targets.push(target);
        scene.add(target);
    }
}

// Génération des ennemis
function generateEnemies(count) {
    for (let i = 0; i < count; i++) {
        const geometry = new THREE.SphereGeometry(0.5, 16, 16);
        let material;
        let speed;
        let damage;
        let enemy_health;
        
        const enemy = new THREE.Mesh(geometry, material);  // Crée l'ennemi d'abord

        // Création de la barre de vie après la création de l'ennemi
        const healthBarGeometry = new THREE.PlaneGeometry(1, 0.1);
        const healthBarMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const healthBar = new THREE.Mesh(healthBarGeometry, healthBarMaterial);
        healthBar.position.set(0, 1, 0);
        enemy.add(healthBar); // Attache la barre de vie à l'ennemi
        enemy.healthBar = healthBar; // Sauvegarde la référence

        const enemyType = Math.random(); // Génère un type d'ennemi aléatoire

        if (enemyType < 0.4) { // 40% de chance d'être un ennemi rapide
            material = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Rouge
            speed = 0.1;
            damage = 10;
            enemy_health = 10;
        } else if (enemyType < 0.8) { // 40% de chance d'être un ennemi fort
            material = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Bleu
            speed = 0.05;
            damage = 30;
            enemy_health = 30;
        } else { // 20% de chance d'être un ennemi lent mais résistant
            material = new THREE.MeshStandardMaterial({ color: 0x00ff00 }); // Vert
            speed = 0.02;
            damage = 50;
            enemy_health = 50;
        }

        // Maintenant que l'ennemi est créé, on définit ses propriétés
        enemy.material = material;
        enemy.position.set((Math.random() - 0.5) * 20, 0.5, (Math.random() - 0.5) * 20);
        enemy.speed = speed;
        enemy.damage = damage;
        enemy.health = enemy_health;

        enemies.push(enemy);
        scene.add(enemy);
    }
}



// Tirs
document.addEventListener('click', () => {
    if (!gameActive || isPaused) return;

    const bulletGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const bulletMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
    bullet.position.set(camera.position.x, camera.position.y, camera.position.z);
    bullet.direction = new THREE.Vector3(0, 0, -1);
    bullets.push(bullet);
    scene.add(bullet);
});

// Vérification des collisions
function checkCollisions() {
    bullets.forEach((bullet, bulletIndex) => {
        bullet.position.add(bullet.direction.clone().multiplyScalar(0.5));

        // Collision avec les cibles
        targets.forEach((target, targetIndex) => {
            if (bullet.position.distanceTo(target.position) < 2) {
                bullets.splice(bulletIndex, 2);
                scene.remove(bullet);
                scene.remove(target);
                targets.splice(targetIndex, 1);
                updateUI();

                if (targets.length === 0) {
                    if (currentLevel < 3) nextLevel();
                    else endGame(true);
                }
            }
        });

        // Collision avec les ennemis
        bullets.forEach((bullet, bulletIndex) => {
            bullet.position.add(bullet.direction.clone().multiplyScalar(0.5));

            enemies.forEach((enemy, enemyIndex) => {
                if (bullet.position.distanceTo(enemy.position) < 1) {
                    enemy.health -= 15; // Une balle enlève 15 PV à l'ennemi
                    bullets.splice(bulletIndex, 1); // Supprime la balle
                    scene.remove(bullet);

                    // Si l'ennemi n'a plus de vie, on le retire
                    if (enemy.health <= 0) {
                        scene.remove(enemy);
                        enemies.splice(enemyIndex, 1); // Supprime l'ennemi s'il n'a plus de vie
                    }
                }

                // Met à jour la barre de vie de l'ennemi
                if (enemy.health > 0) {
                    enemy.healthBar.scale.x = enemy.health / 100; // Ajuste la taille de la barre de vie
                    enemy.healthBar.material.color.setHex(enemy.health > 50 ? 0x00ff00 : 0xff0000); // Vert si PV > 50, rouge sinon
                }
            });
        });
    });
}


// Déplacement des ennemis
function moveEnemies() {
    enemies.forEach((enemy) => {
        const direction = new THREE.Vector3();
        direction.subVectors(camera.position, enemy.position).normalize(); // Direction vers le joueur
        
        // Déplace l'ennemi vers le joueur
        enemy.position.add(direction.multiplyScalar(enemy.speed));

        // Vérifie la collision avec le joueur
        if (enemy.position.distanceTo(camera.position) < 1.5) {
            health -= 20;
            updateUI();
            
            // Replace l'ennemi ailleurs après contact
            enemy.position.set((Math.random() - 0.5) * 20, 0.5, (Math.random() - 0.5) * 20);
        }
    });
}
    
   

// Mise à jour de l'interface utilisateur
function updateUI() {
    healthValue.textContent = health;
    levelValue.textContent = currentLevel;
    remainingValue.textContent = targets.length;
}

// Passer au niveau suivant
function nextLevel() {
    currentLevel++;
    generateTargets(targetsPerLevel);
    generateEnemies(enemiesToSpawn);
    updateUI();
}

// Fin de jeu
function endGame(won) {
    gameActive = false;
    // Afficher un message de perte
    const WinMessage = document.createElement("div");
    WinMessage.style.position = "absolute";
    WinMessage.style.top = "50%";
    WinMessage.style.left = "50%";
    WinMessage.style.transform = "translate(-50%, -50%)";
    WinMessage.style.fontSize = "40px";
    WinMessage.style.color = "Blue";
	WinMessage.style.backgroundColor = "white"
    WinMessage.style.zIndex = "1000";
    WinMessage.textContent = "Tu as gagné !";
    document.body.appendChild(WinMessage);
    location.reload();
}

function gameOver() {
    // Arrêter toute logique de mouvement, tir, etc.
    isGameOver = true;  // Déclare une variable pour vérifier l'état du jeu
    
    // Afficher un message de perte
    const gameOverMessage = document.createElement("div");
    gameOverMessage.style.position = "absolute";
    gameOverMessage.style.top = "50%";
    gameOverMessage.style.left = "50%";
    gameOverMessage.style.transform = "translate(-50%, -50%)";
    gameOverMessage.style.fontSize = "40px";
    gameOverMessage.style.color = "red";
	gameOverMessage.style.backgroundColor = "white"
    gameOverMessage.style.zIndex = "1000";
    gameOverMessage.textContent = "Vous avez perdu !";
    document.body.appendChild(gameOverMessage);
    
    // Désactiver le mouvement et autres interactions du joueur
    document.removeEventListener('keydown', handlePlayerMovement);
    document.removeEventListener('mousedown', shootBullet);
}

let isGameOver = false;

function handlePlayerMovement(event) {
    if (isGameOver) return;  // Si le jeu est terminé, ne fait rien

    // Logique de mouvement du joueur
}

function shootBullet(event) {
    if (isGameOver) return;  // Si le jeu est terminé, ne tire pas

    // Logique pour tirer une balle
}


// Boutons Pause / Rejouer
document.getElementById('pause').addEventListener('click', () => {
    isPaused = !isPaused;
});

document.getElementById('replay').addEventListener('click', () => {
    location.reload();
});

// Boucle du jeu
function animate() {
    if (!isPaused) {
        movePlayer();
        moveEnemies();
        checkCollisions();
        renderer.render(scene, camera);
    }
	// Vérifier si la santé est à 0 ou moins
    if (health <= 0) {
        gameOver();
        return;  // Stoppe l'exécution du jeu
    }
    requestAnimationFrame(animate);
}

// Lancement du jeu
generateTargets(targetsPerLevel);
generateEnemies(enemiesToSpawn);
updateUI();
animate();
