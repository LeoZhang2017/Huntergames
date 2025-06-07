// Hunter Games 3D - Main Game Logic

// Game Constants
const STAGES = {
    WAREHOUSE: 0,
    ARENA: 1,
    FOREST: 2
};

const WEAPONS = {
    AK74: { name: "AK-74", damage: 25, ammoType: "rifle", capacity: 30, model: 'rifle1', scale: 0.5 },
    QBB95: { name: "QBB95", damage: 20, ammoType: "rifle", capacity: 40, model: 'rifle2', scale: 0.5 },
    ROCKET_LAUNCHER: { name: "Rocket Launcher", damage: 100, ammoType: "rocket", capacity: 1, model: 'launcher', scale: 0.7 },
    AKM: { name: "AKM", damage: 30, ammoType: "rifle", capacity: 30, model: 'rifle3', scale: 0.5 },
    L86A2: { name: "L86A2", damage: 22, ammoType: "rifle", capacity: 35, model: 'rifle4', scale: 0.5 },
    AUG_A3: { name: "AUG A3", damage: 28, ammoType: "rifle", capacity: 30, model: 'rifle5', scale: 0.5 }
};

const ITEMS = {
    FOOD: { name: "Food", effect: "Restore health", value: 20, model: 'food', scale: 0.3 },
    WATER: { name: "Water", effect: "Restore stamina", value: 30, model: 'water', scale: 0.3 },
    MEDKIT: { name: "Medkit", effect: "Restore health", value: 50, model: 'medkit', scale: 0.3 },
    AMMO_RIFLE: { name: "Rifle Ammo", type: "rifle", count: 30, model: 'ammo_rifle', scale: 0.3 },
    AMMO_ROCKET: { name: "Rocket", type: "rocket", count: 1, model: 'ammo_rocket', scale: 0.4 },
    GRENADE: { name: "Grenade", damage: 50, radius: 5, model: 'grenade', scale: 0.3 },
    MOLOTOV: { name: "Molotov", damage: 30, duration: 5, model: 'molotov', scale: 0.3 },
    AMMO_INCENDIARY: { name: "Incendiary Ammo", type: "rifle", damage: 35, count: 10, model: 'ammo_special', scale: 0.3 },
    AMMO_EXPLOSIVE: { name: "Explosive Ammo", type: "rifle", damage: 40, count: 10, model: 'ammo_special', scale: 0.3 }
};

// Game State
const gameState = {
    currentStage: STAGES.WAREHOUSE,
    player: {
        health: 100,
        coins: 0,
        inventory: [],
        position: new THREE.Vector3(0, 1, 0),
        rotation: new THREE.Euler(0, 0, 0),
        team: null, // 'red' or 'blue' for stage 2
        kills: 0,
        speed: 0.1,
        weapon: null,
        currentWeaponIndex: -1,
        isReloading: false,
        reloadTime: 0
    },
    enemies: [],
    items: [],
    gameStarted: false,
    stageCompleted: false,
    gameOver: false,
    enemySpawnTimer: 60, // Spawn enemies after 60 seconds
    enemySpawned: false,
    spawnWarningShown: false,
    warningShown: false,
    pointerLocked: false,
    timer: 180, // 3 minutes in seconds
    timerActive: false,
    doors: [],
    doorStates: {}, // Track door states (open/closed)
    wallColliders: [], // Store wall collision boxes
    keys: {},
    moveSpeed: 0.05
};

// THREE.js Variables
let scene, camera, renderer;
let playerObject, weaponObject, weaponGroup;
let skybox;
let terrainGroup, itemsGroup, enemiesGroup, effectsGroup;
let raycaster, mouse;
let clock;
let muzzleFlash;

// UI Elements
const startButton = document.getElementById('start-button');
const currentStageElement = document.getElementById('current-stage');
const healthValueElement = document.getElementById('health-value');
const coinsValueElement = document.getElementById('coins-value');
const ammoValueElement = document.getElementById('ammo-value');
const inventoryElement = document.getElementById('inventory');
const gameMessageElement = document.getElementById('game-message');
const gameContainer = document.getElementById('game-container');

// Input Handling
const keys = {};
let mouseX = 0, mouseY = 0;
let mouseDown = false;

// Game Loop
let gameLoopId = null;

// Initialize the game
function initGame() {
    console.log('Initializing game...'); // Debug log
    
    // Set up THREE.js scene
    setupScene();
    
    // Reset game state
    resetGameState();
    
    // Add event listeners
    setupEventListeners();
    
    // Set up UI
    updateUI();
    
    // Create proper start panel
    createStartPanel();
    
    // Start animation loop
    animate();

    console.log('Game initialized'); // Debug log
}

// Set up THREE.js scene
function setupScene() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x88ccee, 0.002);
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1.6, 0); // Eye height
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x88ccee);
    renderer.shadowMap.enabled = true;
    gameContainer.appendChild(renderer.domElement);
    
    // Set up lighting
    setupLighting();
    
    // Create groups for organizing scene objects
    terrainGroup = new THREE.Group();
    itemsGroup = new THREE.Group();
    enemiesGroup = new THREE.Group();
    effectsGroup = new THREE.Group();
    
    scene.add(terrainGroup);
    scene.add(itemsGroup);
    scene.add(enemiesGroup);
    scene.add(effectsGroup);
    
    // Create player object (invisible, just for collision)
    playerObject = new THREE.Group();
    scene.add(playerObject);
    
    // Create weapon group for first-person weapon view
    weaponGroup = new THREE.Group();
    camera.add(weaponGroup);
    scene.add(camera);
    
    // Initialize raycaster for picking
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // Create clock for timing
    clock = new THREE.Clock();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
}

// Set up lighting in the scene
function setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    
    // Configure shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    
    scene.add(directionalLight);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set up event listeners
function setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // Mouse events
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    
    // Pointer lock API for FPS controls
    document.addEventListener('pointerlockchange', onPointerLockChange);
    document.addEventListener('pointerlockerror', onPointerLockError);

    console.log('Event listeners set up'); // Debug log
}

// Pointer lock change handler
function onPointerLockChange() {
    gameState.pointerLocked = document.pointerLockElement === gameContainer;
    
    if (gameState.pointerLocked) {
        document.body.classList.add('game-active');
    } else {
        document.body.classList.remove('game-active');
        
        // If game is running and not at checkpoint, pause game
        if (gameState.gameStarted && !gameState.stageCompleted && !gameState.gameOver) {
            pauseGame();
        }
    }
}

// Pointer lock error handler
function onPointerLockError() {
    console.error("Pointer lock error");
}

// Reset game state
function resetGameState() {
    gameState.currentStage = STAGES.WAREHOUSE;
    gameState.player = {
        health: 100,
        coins: 0,
        inventory: [],
        position: new THREE.Vector3(0, 1, 0),
        rotation: new THREE.Euler(0, 0, 0),
        team: null,
        kills: 0,
        speed: 0.1,
        weapon: null,
        currentWeaponIndex: -1,
        isReloading: false,
        reloadTime: 0
    };
    gameState.enemies = [];
    gameState.items = [];
    gameState.gameStarted = false;
    gameState.stageCompleted = false;
    gameState.gameOver = false;
    gameState.enemySpawnTimer = 60; // Spawn enemies after 60 seconds
    gameState.enemySpawned = false;
    
    // Reset camera position
    camera.position.set(0, 1.6, 0);
    camera.rotation.set(0, 0, 0);
    
    // Set up the appropriate stage
    setupStage(gameState.currentStage);
}

// Set up a specific stage
function setupStage(stage) {
    // Clear existing items and enemies
    clearStage();
    
    // Create new terrain based on stage
    createTerrain(stage);
    
    // Set stage-specific elements
    switch(stage) {
        case STAGES.WAREHOUSE:
            currentStageElement.textContent = "The Warehouse";
            spawnWarehouseItems();
            startTimer();
            break;
        case STAGES.ARENA:
            currentStageElement.textContent = "Reds or Blues";
            setupArenaStage();
            break;
        case STAGES.FOREST:
            currentStageElement.textContent = "The Billionaire Hunter";
            setupForestStage();
            break;
    }
}

// Clear all stage elements
function clearStage() {
    // Clear terrain
    while(terrainGroup.children.length > 0) {
        terrainGroup.remove(terrainGroup.children[0]);
    }
    
    // Clear items
    while(itemsGroup.children.length > 0) {
        itemsGroup.remove(itemsGroup.children[0]);
    }
    
    // Clear enemies
    while(enemiesGroup.children.length > 0) {
        enemiesGroup.remove(enemiesGroup.children[0]);
    }
    
    // Clear arrays
    gameState.enemies = [];
    gameState.items = [];
    gameState.wallColliders = []; // Clear collision boxes
}

// Create terrain based on current stage
function createTerrain(stage) {
    switch(stage) {
        case STAGES.WAREHOUSE:
            createWarehouseTerrain();
            break;
        case STAGES.ARENA:
            createArenaTerrain();
            break;
        case STAGES.FOREST:
            createForestTerrain();
            break;
    }
}

// Create warehouse terrain
function createWarehouseTerrain() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(100, 100);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x999999, 
        roughness: 0.8 
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    terrainGroup.add(floor);
    
    // Create walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x777777, 
        roughness: 0.7 
    });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(100, 10, 1);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, 5, -50);
    northWall.castShadow = true;
    terrainGroup.add(northWall);
    
    // South wall
    const southWall = northWall.clone();
    southWall.position.set(0, 5, 50);
    terrainGroup.add(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(1, 10, 100);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(50, 5, 0);
    eastWall.castShadow = true;
    terrainGroup.add(eastWall);
    
    // West wall
    const westWall = eastWall.clone();
    westWall.position.set(-50, 5, 0);
    terrainGroup.add(westWall);

    // Create warehouse sections using divider walls
    const dividerMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x555555, 
        roughness: 0.8 
    });
    
    // Create central dividers (to create a maze-like structure)
    // Horizontal dividers
    for (let i = -30; i <= 30; i += 30) {
        if (i === 0) continue; // Skip center to leave a passage
        
        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(80, 8, 1),
            dividerMaterial
        );
        divider.position.set(0, 4, i);
        divider.castShadow = true;
        divider.receiveShadow = true;
        terrainGroup.add(divider);
    }
    
    // Vertical dividers
    for (let i = -30; i <= 30; i += 30) {
        // Skip some sections to create pathways
        if (i === 0) continue;
        
        const divider = new THREE.Mesh(
            new THREE.BoxGeometry(1, 8, 60),
            dividerMaterial
        );
        divider.position.set(i, 4, 0);
        divider.castShadow = true;
        divider.receiveShadow = true;
        terrainGroup.add(divider);
    }

    // Create doors
    const doorGeometry = new THREE.BoxGeometry(4, 6, 0.2);
    const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    
    // Create doors at specific locations
    const doorPositions = [
        // Outer wall doors
        { x: 0, z: -49, rotation: 0 },    // North door
        { x: 0, z: 49, rotation: 0 },     // South door
        { x: -49, z: 0, rotation: Math.PI/2 },  // West door
        { x: 49, z: 0, rotation: Math.PI/2 },   // East door
        
        // Section connecting doors
        { x: -30, z: -15, rotation: Math.PI/2 },  // Left section to center
        { x: -30, z: 15, rotation: Math.PI/2 },   // Left section to center
        { x: 30, z: -15, rotation: Math.PI/2 },   // Right section to center
        { x: 30, z: 15, rotation: Math.PI/2 },    // Right section to center
        { x: -15, z: -30, rotation: 0 },          // Top section to center
        { x: 15, z: -30, rotation: 0 },           // Top section to center
        { x: -15, z: 30, rotation: 0 },           // Bottom section to center
        { x: 15, z: 30, rotation: 0 }             // Bottom section to center
    ];

    doorPositions.forEach((pos, index) => {
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(pos.x, 3, pos.z);
        door.rotation.y = pos.rotation;
        scene.add(door);
        gameState.doors.push(door);
        gameState.doorStates[index] = false; // false = closed

        // Add door frame
        const frameGeometry = new THREE.BoxGeometry(5, 7, 0.5);
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const frame = new THREE.Mesh(frameGeometry, frameMaterial);
        frame.position.set(pos.x, 3.5, pos.z);
        frame.rotation.y = pos.rotation;
        terrainGroup.add(frame);
    });

    // Create wall colliders
    gameState.wallColliders = []; // Clear existing colliders

    // Outer walls
    const outerWalls = [
        { min: [-50, 0, -50], max: [50, 10, -49] },  // North wall
        { min: [-50, 0, 49], max: [50, 10, 50] },    // South wall
        { min: [-50, 0, -50], max: [-49, 10, 50] },  // West wall
        { min: [49, 0, -50], max: [50, 10, 50] }     // East wall
    ];

    outerWalls.forEach(wall => {
        const box = new THREE.Box3(
            new THREE.Vector3(...wall.min),
            new THREE.Vector3(...wall.max)
        );
        gameState.wallColliders.push(box);
    });

    // Divider walls with door gaps
    const dividerWalls = [
        // North divider (with gaps for doors)
        { min: [-50, 0, -30], max: [-32, 8, -29] },  // Left of door
        { min: [-28, 0, -30], max: [28, 8, -29] },   // Center
        { min: [32, 0, -30], max: [50, 8, -29] },    // Right of door
        
        // South divider (with gaps for doors)
        { min: [-50, 0, 29], max: [-32, 8, 30] },    // Left of door
        { min: [-28, 0, 29], max: [28, 8, 30] },     // Center
        { min: [32, 0, 29], max: [50, 8, 30] },      // Right of door
        
        // West divider (with gaps for doors)
        { min: [-30, 0, -50], max: [-29, 8, -32] },  // Top of door
        { min: [-30, 0, -28], max: [-29, 8, 28] },   // Center
        { min: [-30, 0, 32], max: [-29, 8, 50] },    // Bottom of door
        
        // East divider (with gaps for doors)
        { min: [29, 0, -50], max: [30, 8, -32] },    // Top of door
        { min: [29, 0, -28], max: [30, 8, 28] },     // Center
        { min: [29, 0, 32], max: [30, 8, 50] }       // Bottom of door
    ];

    dividerWalls.forEach(wall => {
        const box = new THREE.Box3(
            new THREE.Vector3(...wall.min),
            new THREE.Vector3(...wall.max)
        );
        gameState.wallColliders.push(box);
    });
    
    // Create shelves in different sections
    const shelfGeometry = new THREE.BoxGeometry(15, 5, 2);
    const shelfMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x8B4513, 
        roughness: 0.9 
    });
    
    // Create shelves in a grid pattern in each section
    const sections = [
        { x: -35, z: -35 }, // Top left section
        { x: -35, z: 35 },  // Bottom left section
        { x: 35, z: -35 },  // Top right section
        { x: 35, z: 35 }    // Bottom right section
    ];
    
    sections.forEach(section => {
        // Create a shelf unit
        const shelf = new THREE.Mesh(shelfGeometry, shelfMaterial);
        shelf.position.set(section.x, 2.5, section.z);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        terrainGroup.add(shelf);
        
        // Create a second perpendicular shelf
        const crossShelf = new THREE.Mesh(
            new THREE.BoxGeometry(2, 5, 15),
            shelfMaterial
        );
        crossShelf.position.set(section.x, 2.5, section.z);
        crossShelf.castShadow = true;
        crossShelf.receiveShadow = true;
        terrainGroup.add(crossShelf);
    });
    
    // Create crates of different sizes
    const crateSizes = [
        { width: 2, height: 2, depth: 2 },
        { width: 3, height: 2, depth: 2 },
        { width: 2, height: 2, depth: 3 },
        { width: 1.5, height: 1.5, depth: 1.5 }
    ];
    
    // Distribute crates throughout the warehouse
    for (let i = 0; i < 40; i++) {
        const sizeIndex = Math.floor(Math.random() * crateSizes.length);
        const size = crateSizes[sizeIndex];
        
        const crateGeometry = new THREE.BoxGeometry(size.width, size.height, size.depth);
        const crateMaterial = new THREE.MeshStandardMaterial({ 
            color: Math.random() > 0.5 ? 0x8B4513 : 0x654321, 
            roughness: 0.9 
        });
        
        const crate = new THREE.Mesh(crateGeometry, crateMaterial);
        
        // Position crates to avoid major walkways
        let x, z;
        do {
            x = Math.random() * 80 - 40;
            z = Math.random() * 80 - 40;
            // Avoid placing crates in the center pathways
            if (Math.abs(x) < 5 || Math.abs(z) < 5) continue;
            break;
        } while (true);
        
        crate.position.set(
            x,
            size.height / 2, // Place on ground
            z
        );
        crate.castShadow = true;
        crate.receiveShadow = true;
        terrainGroup.add(crate);
    }
    
    // Add ceiling lights
    const lightGeometry = new THREE.BoxGeometry(5, 0.5, 5);
    const lightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffcc });
    
    for (let x = -40; x <= 40; x += 20) {
        for (let z = -40; z <= 40; z += 20) {
            const light = new THREE.Mesh(lightGeometry, lightMaterial);
            light.position.set(x, 9.8, z);
            terrainGroup.add(light);
            
            // Add point light
            const pointLight = new THREE.PointLight(0xffffcc, 0.5, 20);
            pointLight.position.set(x, 9, z);
            terrainGroup.add(pointLight);
        }
    }
    
    // Add objective indicator (exit door)
    const doorFrameGeometry = new THREE.BoxGeometry(10, 8, 1);
    const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const doorFrame = new THREE.Mesh(doorFrameGeometry, doorFrameMaterial);
    doorFrame.position.set(0, 4, -49.5); // North wall center
    terrainGroup.add(doorFrame);
    
    // Add glow effect to indicate objective
    const glowGeometry = new THREE.PlaneGeometry(8, 6);
    const glowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00ff00, 
        transparent: true,
        opacity: 0.3
    });
    const glowPlane = new THREE.Mesh(glowGeometry, glowMaterial);
    glowPlane.position.set(0, 4, -49);
    terrainGroup.add(glowPlane);
    
    // Add sign above door
    const signGeometry = new THREE.BoxGeometry(10, 1, 0.5);
    const signMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const sign = new THREE.Mesh(signGeometry, signMaterial);
    sign.position.set(0, 8.5, -49.5);
    terrainGroup.add(sign);
    
    // Add a few additional lights to illuminate the door/objective
    const objectiveLight = new THREE.PointLight(0x00ff00, 1, 20);
    objectiveLight.position.set(0, 5, -45);
    terrainGroup.add(objectiveLight);
}

// Create arena terrain
function createArenaTerrain() {
    // Create floor
    const floorGeometry = new THREE.PlaneGeometry(200, 100);
    const floorTexture = new THREE.TextureLoader().load('path/to/arena-floor.jpg');
    floorTexture.wrapS = THREE.RepeatWrapping;
    floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(10, 5);
    
    const floorMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xDDDDDD,
        roughness: 0.8
    });
    
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    terrainGroup.add(floor);
    
    // Create arena walls
    const wallMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x888888, 
        roughness: 0.7 
    });
    
    // North wall
    const northWallGeometry = new THREE.BoxGeometry(200, 10, 1);
    const northWall = new THREE.Mesh(northWallGeometry, wallMaterial);
    northWall.position.set(0, 5, -50);
    northWall.castShadow = true;
    terrainGroup.add(northWall);
    
    // South wall
    const southWall = northWall.clone();
    southWall.position.set(0, 5, 50);
    terrainGroup.add(southWall);
    
    // East wall
    const eastWallGeometry = new THREE.BoxGeometry(1, 10, 100);
    const eastWall = new THREE.Mesh(eastWallGeometry, wallMaterial);
    eastWall.position.set(100, 5, 0);
    eastWall.castShadow = true;
    terrainGroup.add(eastWall);
    
    // West wall
    const westWall = eastWall.clone();
    westWall.position.set(-100, 5, 0);
    terrainGroup.add(westWall);
    
    // Create obstacles and cover in the middle of the arena
    createArenaObstacles();
    
    // Add decorative elements
    addArenaDecorations();
    
    // Create wall colliders for arena
    gameState.wallColliders = []; // Clear existing colliders
    
    // Arena outer walls
    const arenaWalls = [
        { min: [-100, 0, -50], max: [100, 10, -49] },  // North wall
        { min: [-100, 0, 49], max: [100, 10, 50] },    // South wall  
        { min: [-100, 0, -50], max: [-99, 10, 50] },   // West wall
        { min: [99, 0, -50], max: [100, 10, 50] }      // East wall
    ];

    arenaWalls.forEach(wall => {
        const box = new THREE.Box3(
            new THREE.Vector3(...wall.min),
            new THREE.Vector3(...wall.max)
        );
        gameState.wallColliders.push(box);
    });
    
    console.log('Arena collision boxes created:', gameState.wallColliders.length); // Debug
}

// Create obstacles for the arena
function createArenaObstacles() {
    // Create concrete barriers
    const barrierGeometry = new THREE.BoxGeometry(3, 1, 1);
    const barrierMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCCC, 
        roughness: 0.9 
    });
    
    // Create center obstacles
    for (let i = -30; i <= 30; i += 15) {
        const barrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
        barrier.position.set(i, 0.5, 0);
        barrier.rotation.y = Math.PI / 4;
        barrier.castShadow = true;
        barrier.receiveShadow = true;
        terrainGroup.add(barrier);
        
        // Add collision box for this barrier
        const barrierBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(i, 0.5, 0),
            new THREE.Vector3(3, 1, 1)
        );
        gameState.wallColliders.push(barrierBox);
    }
    
    // Create containers for cover
    const containerGeometry = new THREE.BoxGeometry(5, 2.5, 2.5);
    const containerMaterials = [
        new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.8 }), // Brown
        new THREE.MeshStandardMaterial({ color: 0x2E8B57, roughness: 0.8 }), // Green
        new THREE.MeshStandardMaterial({ color: 0x4682B4, roughness: 0.8 })  // Blue
    ];
    
    // Place containers in strategic positions
    const containerPositions = [
        { x: 0, z: 20, rotation: 0 },
        { x: 0, z: -20, rotation: 0 },
        { x: 30, z: 20, rotation: Math.PI / 4 },
        { x: 30, z: -20, rotation: -Math.PI / 4 },
        { x: -30, z: 20, rotation: -Math.PI / 4 },
        { x: -30, z: -20, rotation: Math.PI / 4 },
        { x: 60, z: 0, rotation: 0 },
        { x: -60, z: 0, rotation: 0 }
    ];
    
    containerPositions.forEach(pos => {
        const material = containerMaterials[Math.floor(Math.random() * containerMaterials.length)];
        const container = new THREE.Mesh(containerGeometry, material);
        container.position.set(pos.x, 1.25, pos.z);
        container.rotation.y = pos.rotation;
        container.castShadow = true;
        container.receiveShadow = true;
        terrainGroup.add(container);
        
        // Add collision box for this container
        const containerBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, 1.25, pos.z),
            new THREE.Vector3(5, 2.5, 2.5)
        );
        gameState.wallColliders.push(containerBox);
    });
    
    // Create bunkers
    const bunkerPositions = [
        { x: 50, z: 25 },
        { x: -50, z: 25 },
        { x: 50, z: -25 },
        { x: -50, z: -25 }
    ];
    
    bunkerPositions.forEach(pos => {
        createBunker(pos.x, pos.z);
    });
}

// Create a bunker at given position
function createBunker(x, z) {
    const baseGeometry = new THREE.CylinderGeometry(4, 4, 1, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const base = new THREE.Mesh(baseGeometry, baseMaterial);
    base.position.set(x, 0.5, z);
    terrainGroup.add(base);
    
    const wallGeometry = new THREE.CylinderGeometry(4, 4, 1.5, 8, 1, false, 0, Math.PI * 1.5);
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x777777 });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.set(x, 1.75, z);
    wall.rotation.y = Math.random() * Math.PI * 2; // Random orientation
    terrainGroup.add(wall);
    
    // Add collision box for bunker (circular collision approximated with square)
    const bunkerBox = new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(x, 1.25, z),
        new THREE.Vector3(7, 2.5, 7) // Slightly larger than bunker for easier collision
    );
    gameState.wallColliders.push(bunkerBox);
}

// Add decorative elements to the arena
function addArenaDecorations() {
    // Add spotlights around the arena
    const spotlightPositions = [
        { x: 90, z: 40 },
        { x: -90, z: 40 },
        { x: 90, z: -40 },
        { x: -90, z: -40 }
    ];
    
    spotlightPositions.forEach(pos => {
        // Create spotlight post
        const postGeometry = new THREE.CylinderGeometry(0.5, 0.5, 8, 8);
        const postMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const post = new THREE.Mesh(postGeometry, postMaterial);
        post.position.set(pos.x, 4, pos.z);
        terrainGroup.add(post);
        
        // Add collision box for spotlight post
        const postBox = new THREE.Box3().setFromCenterAndSize(
            new THREE.Vector3(pos.x, 4, pos.z),
            new THREE.Vector3(1, 8, 1)
        );
        gameState.wallColliders.push(postBox);
        
        // Create spotlight head
        const headGeometry = new THREE.ConeGeometry(1, 2, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.rotation.x = Math.PI / 2;
        head.position.y = 4;
        
        // Rotate toward center
        const angle = Math.atan2(-pos.z, -pos.x);
        head.rotation.z = angle;
        post.add(head);
        
        // Add actual light
        const spotlight = new THREE.SpotLight(0xffffff, 1);
        spotlight.position.set(0, 4, 0);
        spotlight.target.position.set(-pos.x, 0, -pos.z);
        spotlight.angle = Math.PI / 8;
        spotlight.penumbra = 0.2;
        spotlight.distance = 150;
        spotlight.castShadow = true;
        post.add(spotlight);
        post.add(spotlight.target);
    });
    
    // Add arena ground markings
    const markingsGeometry = new THREE.RingGeometry(10, 10.5, 32);
    const markingsMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const centerRing = new THREE.Mesh(markingsGeometry, markingsMaterial);
    centerRing.rotation.x = -Math.PI / 2;
    centerRing.position.y = 0.01; // Just above ground
    terrainGroup.add(centerRing);
    
    // Add middle line
    const lineGeometry = new THREE.PlaneGeometry(180, 1);
    const lineMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const middleLine = new THREE.Mesh(lineGeometry, lineMaterial);
    middleLine.rotation.x = -Math.PI / 2;
    middleLine.position.y = 0.01;
    terrainGroup.add(middleLine);
}

// Spawn items in the warehouse stage
function spawnWarehouseItems() {
    // Create more weapon placement zones (scattered throughout warehouse)
    const weaponZones = [
        { x: -35, z: -35, radius: 8 }, // Top left
        { x: 35, z: -35, radius: 8 },  // Top right
        { x: -35, z: 35, radius: 8 },  // Bottom left
        { x: 35, z: 35, radius: 8 },   // Bottom right
        { x: 0, z: -35, radius: 6 },   // Top center
        { x: 0, z: 35, radius: 6 },    // Bottom center
        { x: -35, z: 0, radius: 6 },   // Left center
        { x: 35, z: 0, radius: 6 },    // Right center
        { x: -15, z: -15, radius: 5 }, // Inner zones
        { x: 15, z: -15, radius: 5 },
        { x: -15, z: 15, radius: 5 },
        { x: 15, z: 15, radius: 5 }
    ];
    
    // Spawn multiple instances of each weapon type
    const weaponKeys = Object.keys(WEAPONS);
    let weaponCount = 0;
    
    // Create 3 instances of each weapon scattered around
    for (let weaponInstance = 0; weaponInstance < 3; weaponInstance++) {
        for (let i = 0; i < weaponKeys.length; i++) {
            const weaponType = weaponKeys[i];
            const weapon = WEAPONS[weaponType];
            
            // Select zone for this weapon (cycle through zones)
            const zone = weaponZones[weaponCount % weaponZones.length];
            weaponCount++;
            
            // Create a weapon model with different colors for different types
            const weaponGeometry = new THREE.BoxGeometry(1, 0.2, 0.5);
            let weaponColor;
            switch(weapon.model) {
                case 'launcher': weaponColor = 0x444444; break;
                case 'rifle1': weaponColor = 0x8B4513; break;
                case 'rifle2': weaponColor = 0x2F4F4F; break;
                case 'rifle3': weaponColor = 0x556B2F; break;
                case 'rifle4': weaponColor = 0x800080; break;
                case 'rifle5': weaponColor = 0xFF4500; break;
                default: weaponColor = 0xff0000;
            }
            
            const weaponMaterial = new THREE.MeshStandardMaterial({ color: weaponColor });
            const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
            
            // Position within zone (random point within circle)
            let x, z;
            let attempts = 0;
            do {
                const angle = Math.random() * Math.PI * 2;
                const distance = Math.random() * zone.radius;
                x = zone.x + Math.cos(angle) * distance;
                z = zone.z + Math.sin(angle) * distance;
                attempts++;
                
                // Make sure weapon is not too close to walls or in blocked areas
                if (Math.abs(x) < 48 && Math.abs(z) < 48) break;
                
            } while (attempts < 10);
            
            weaponMesh.position.set(x, 0.5, z);
            weaponMesh.rotation.y = Math.random() * Math.PI * 2;
            weaponMesh.castShadow = true;
            
            // Add floating animation
            const floatHeight = 0.5 + Math.random() * 0.2;
            const floatSpeed = 0.5 + Math.random() * 0.5;
            weaponMesh.userData = {
                baseY: floatHeight,
                floatSpeed: floatSpeed,
                floatTime: Math.random() * Math.PI * 2 // Random start phase
            };
            
            // Add highlight effect (different color for different weapon types)
            const highlightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
            const highlightMaterial = new THREE.MeshBasicMaterial({
                color: weaponColor,
                transparent: true,
                opacity: 0.3
            });
            const highlight = new THREE.Mesh(highlightGeometry, highlightMaterial);
            highlight.scale.set(2, 1, 2);
            highlight.position.y = 0.1;
            weaponMesh.add(highlight);
            
            itemsGroup.add(weaponMesh);
            
            // Add to game state
            gameState.items.push({
                type: 'weapon',
                weapon: weapon,
                position: new THREE.Vector3(x, floatHeight, z),
                mesh: weaponMesh
            });
        }
    }
    
    // Spawn ammo more generously
    const ammoTypes = [
        { type: ITEMS.AMMO_RIFLE, color: 0x0000ff, count: 30 },
        { type: ITEMS.AMMO_ROCKET, color: 0xff00ff, count: 10 }
    ];
    
    // Create ammo trails leading to objectives
    const createAmmoTrail = (startX, startZ, endX, endZ, count, ammoType) => {
        for (let i = 0; i < count; i++) {
            const t = i / (count - 1);
            const x = startX + (endX - startX) * t;
            const z = startZ + (endZ - startZ) * t;
            
            spawnAmmo(x, z, ammoType);
        }
    };
    
    // Create ammo clusters in specific areas
    const createAmmoCluster = (centerX, centerZ, radius, count, ammoType) => {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * radius;
            const x = centerX + Math.cos(angle) * distance;
            const z = centerZ + Math.sin(angle) * distance;
            
            spawnAmmo(x, z, ammoType);
        }
    };
    
    // Helper function to spawn a single ammo pickup
    function spawnAmmo(x, z, ammoType) {
        const ammoGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.3);
        const ammoMaterial = new THREE.MeshStandardMaterial({ color: ammoType.color });
        const ammoMesh = new THREE.Mesh(ammoGeometry, ammoMaterial);
        
        // Floating animation
        const floatHeight = 0.5 + Math.random() * 0.3;
        const floatSpeed = 0.6 + Math.random() * 0.4;
        
        ammoMesh.position.set(x, floatHeight, z);
        ammoMesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );
        ammoMesh.castShadow = true;
        
        // Store animation parameters
        ammoMesh.userData = {
            baseY: floatHeight,
            floatSpeed: floatSpeed,
            floatTime: Math.random() * Math.PI * 2,
            rotationSpeed: 0.02 + Math.random() * 0.03
        };
        
        itemsGroup.add(ammoMesh);
        
        // Add to game state
        gameState.items.push({
            type: 'ammo',
            ammo: ammoType.type,
            position: new THREE.Vector3(x, floatHeight, z),
            mesh: ammoMesh
        });
    }
    
    // Create ammo trails leading to objectives
    createAmmoTrail(-20, 20, 0, 0, 8, ammoTypes[0]);  // From bottom left to center
    createAmmoTrail(20, 20, 0, 0, 8, ammoTypes[0]);   // From bottom right to center
    createAmmoTrail(0, 0, 0, -40, 15, ammoTypes[1]);  // From center to exit door
    
    // Create ammo clusters in different warehouse sections
    createAmmoCluster(-35, -35, 8, 10, ammoTypes[0]);  // Top left
    createAmmoCluster(35, -35, 8, 10, ammoTypes[0]);   // Top right
    createAmmoCluster(-35, 35, 8, 10, ammoTypes[0]);   // Bottom left
    createAmmoCluster(35, 35, 8, 10, ammoTypes[0]);    // Bottom right
    
    // High-value ammo cluster near exit
    createAmmoCluster(0, -40, 5, 5, ammoTypes[1]);
    
    // Scatter coins throughout the warehouse
    spawnWarehouseCoins();
    
    // Add a few health items
    for (let i = 0; i < 3; i++) {
        const healthGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6);
        const healthMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const healthMesh = new THREE.Mesh(healthGeometry, healthMaterial);
        
        const x = Math.random() * 80 - 40;
        const z = Math.random() * 80 - 40;
        const floatHeight = 0.5 + Math.random() * 0.3;
        
        healthMesh.position.set(x, floatHeight, z);
        healthMesh.userData = {
            baseY: floatHeight,
            floatSpeed: 0.7,
            floatTime: Math.random() * Math.PI * 2
        };
        
        // Add red cross symbol
        const crossGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.1);
        const crossMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const horizontalCross = new THREE.Mesh(crossGeometry, crossMaterial);
        horizontalCross.position.z = 0.31;
        
        const verticalCross = new THREE.Mesh(
            new THREE.BoxGeometry(0.1, 0.1, 0.4),
            crossMaterial
        );
        verticalCross.position.z = 0.31;
        
        healthMesh.add(horizontalCross);
        healthMesh.add(verticalCross);
        
        itemsGroup.add(healthMesh);
        
        // Add to game state
        gameState.items.push({
            type: 'health',
            value: 25,
            position: new THREE.Vector3(x, floatHeight, z),
            mesh: healthMesh
        });
    }
}

// Spawn enemies for the warehouse stage (after 1 minute)
function spawnWarehouseEnemies() {
    // Create a grid of spawn points
    const spawnPoints = [];
    
    // Add perimeter spawn points
    for (let x = -45; x <= 45; x += 15) {
        spawnPoints.push({ x: x, z: -45 }); // North wall
        spawnPoints.push({ x: x, z: 45 });  // South wall
    }
    for (let z = -30; z <= 30; z += 15) {
        spawnPoints.push({ x: -45, z: z }); // West wall
        spawnPoints.push({ x: 45, z: z });  // East wall
    }
    
    // Add interior spawn points (avoiding center area)
    for (let x = -30; x <= 30; x += 15) {
        for (let z = -30; z <= 30; z += 15) {
            // Skip the central safe zone
            if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
            spawnPoints.push({ x, z });
        }
    }
    
    // Randomly select 10-15 spawn points
    const numEnemies = 10 + Math.floor(Math.random() * 6);
    const selectedPoints = [];
    
    while (selectedPoints.length < numEnemies && spawnPoints.length > 0) {
        const index = Math.floor(Math.random() * spawnPoints.length);
        selectedPoints.push(spawnPoints.splice(index, 1)[0]);
    }
    
    // Spawn enemies at selected points
    selectedPoints.forEach(point => {
        // Add random offset to make spawning less grid-like
        const offset = {
            x: (Math.random() - 0.5) * 8,
            z: (Math.random() - 0.5) * 8
        };
        
        // 70% chance for knife enemy, 30% for gun enemy
        const hasKnife = Math.random() < 0.7;
        
        createKnifeEnemy(
            point.x + offset.x,
            point.z + offset.z,
            hasKnife
        );
    });
    
    // Show warning message with enemy breakdown
    const knifeCount = Math.round(numEnemies * 0.7);
    const gunCount = numEnemies - knifeCount;
    showPickupMessage(
        `${numEnemies} enemies have spawned! ${knifeCount} with knives, ${gunCount} with guns. Be careful!`,
        true
    );
}

// Create a knife-wielding enemy
function createKnifeEnemy(x, z, hasKnife = true) {
    // Create enemy body
    const enemyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const enemyMaterial = new THREE.MeshStandardMaterial({ 
        color: hasKnife ? 0x8B0000 : 0x4B0082 // Dark red for knife, dark blue for gun
    });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    enemyMesh.position.set(x, 1, z);
    enemyMesh.castShadow = true;
    
    // Add simple face
    const faceGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB5 });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.y = 0.6;
    enemyMesh.add(face);
    
    // Add weapon
    if (hasKnife) {
        // Create knife
        const knifeHandle = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6),
            new THREE.MeshStandardMaterial({ color: 0x8B4513 })
        );
        knifeHandle.position.set(0.4, 0, 0);
        knifeHandle.rotation.z = Math.PI / 4;
        
        const knifeBlade = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.4, 0.02),
            new THREE.MeshStandardMaterial({ color: 0xC0C0C0 })
        );
        knifeBlade.position.set(0.55, 0.15, 0);
        
        enemyMesh.add(knifeHandle);
        enemyMesh.add(knifeBlade);
    } else {
        // Create simple gun
        const gun = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.05, 0.3),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        gun.position.set(0.3, 0, 0.15);
        enemyMesh.add(gun);
    }
    
    enemiesGroup.add(enemyMesh);
    
    // Add enemy to game state
    const enemy = {
        mesh: enemyMesh,
        position: new THREE.Vector3(x, 1, z),
        health: hasKnife ? 50 : 75, // Knife enemies have less health
        speed: hasKnife ? 0.03 : 0.02, // Knife enemies move faster
        type: hasKnife ? 'knife' : 'gun',
        weapon: hasKnife ? 'knife' : 'pistol',
        damage: hasKnife ? 15 : 10,
        attackRange: hasKnife ? 2 : 15, // Knife enemies need to get close
        attackCooldown: 0,
        maxAttackCooldown: hasKnife ? 1.5 : 3.0, // Knife attacks faster when in range
        lastAttackTime: 0,
        target: gameState.player.position,
        state: 'moving', // 'moving', 'attacking', 'dead'
        aggroRange: 25 // How far they can detect the player
    };
    
    gameState.enemies.push(enemy);
}

// Spawn coins throughout the warehouse
function spawnWarehouseCoins() {
    // Create coin zones throughout the warehouse
    const coinZones = [
        // Corner areas
        { x: -40, z: -40, radius: 8, count: 5 },
        { x: 40, z: -40, radius: 8, count: 5 },
        { x: -40, z: 40, radius: 8, count: 5 },
        { x: 40, z: 40, radius: 8, count: 5 },
        
        // Wall areas
        { x: 0, z: -45, radius: 6, count: 3 },
        { x: 0, z: 45, radius: 6, count: 3 },
        { x: -45, z: 0, radius: 6, count: 3 },
        { x: 45, z: 0, radius: 6, count: 3 },
        
        // Inner areas
        { x: -20, z: -20, radius: 5, count: 4 },
        { x: 20, z: -20, radius: 5, count: 4 },
        { x: -20, z: 20, radius: 5, count: 4 },
        { x: 20, z: 20, radius: 5, count: 4 },
        
        // Central pathways
        { x: 0, z: -20, radius: 4, count: 3 },
        { x: 0, z: 20, radius: 4, count: 3 },
        { x: -20, z: 0, radius: 4, count: 3 },
        { x: 20, z: 0, radius: 4, count: 3 }
    ];
    
    coinZones.forEach(zone => {
        for (let i = 0; i < zone.count; i++) {
            // Random position within zone
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * zone.radius;
            const x = zone.x + Math.cos(angle) * distance;
            const z = zone.z + Math.sin(angle) * distance;
            
            // Create coin with random value
            const coinValue = Math.random() < 0.3 ? 10 : 5; // 30% chance for 10 coins, 70% for 5 coins
            spawnCoin(x, z, coinValue);
        }
    });
    
    // Add some special high-value coins in harder to reach places
    const specialCoins = [
        { x: 0, z: 0, value: 25 }, // Center of warehouse
        { x: -35, z: -35, value: 20 }, // Behind shelves
        { x: 35, z: 35, value: 20 },
        { x: 0, z: -45, value: 15 }, // Near exit
    ];
    
    specialCoins.forEach(coin => {
        spawnCoin(coin.x, coin.z, coin.value);
    });
}

// Spawn a single coin
function spawnCoin(x, z, value) {
    // Create coin geometry
    const coinGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.05, 16);
    const coinMaterial = new THREE.MeshStandardMaterial({ 
        color: value >= 20 ? 0xFFD700 : value >= 10 ? 0xFFA500 : 0xFFFF00, // Gold, orange, or yellow based on value
        metalness: 0.8,
        roughness: 0.2
    });
    
    const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
    
    // Position coin
    const floatHeight = 0.3 + Math.random() * 0.2;
    coinMesh.position.set(x, floatHeight, z);
    coinMesh.rotation.x = Math.PI / 2; // Flat orientation
    coinMesh.castShadow = true;
    
    // Add floating and spinning animation
    coinMesh.userData = {
        baseY: floatHeight,
        floatSpeed: 1.0 + Math.random() * 0.5,
        floatTime: Math.random() * Math.PI * 2,
        rotationSpeed: 0.03 + Math.random() * 0.02,
        value: value
    };
    
    // Add glow effect for high-value coins
    if (value >= 15) {
        const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: value >= 20 ? 0xFFD700 : 0xFFA500,
            transparent: true,
            opacity: 0.2
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.position.set(0, -0.025, 0);
        coinMesh.add(glow);
    }
    
    // Add sparkle effect for special coins
    if (value >= 20) {
        for (let i = 0; i < 3; i++) {
            const sparkleGeometry = new THREE.SphereGeometry(0.02, 8, 8);
            const sparkleMaterial = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.8
            });
            const sparkle = new THREE.Mesh(sparkleGeometry, sparkleMaterial);
            
            const sparkleAngle = (Math.PI * 2 * i) / 3;
            sparkle.position.set(
                Math.cos(sparkleAngle) * 0.3,
                Math.sin(sparkleAngle) * 0.1,
                Math.sin(sparkleAngle) * 0.3
            );
            
            coinMesh.add(sparkle);
        }
    }
    
    itemsGroup.add(coinMesh);
    
    // Add to game state
    gameState.items.push({
        type: 'coin',
        value: value,
        position: new THREE.Vector3(x, floatHeight, z),
        mesh: coinMesh
    });
}

// Setup arena stage (Stage 2)
function setupArenaStage() {
    // Create arena terrain
    createArenaTerrain();
    
    // Spawn arena enemies
    spawnArenaEnemies();
    
    // Team selection will be shown after this function
}

// Setup forest stage (Stage 3)
function setupForestStage() {
    // Boss battle will be implemented here
    showPickupMessage("Forest stage is under development! Prepare for the final boss!", false);
    
    // Spawn boss enemy for testing
    spawnForestBoss();
}

// Spawn enemies for arena stage
function spawnArenaEnemies() {
    const enemySpawnPoints = [
        { x: -80, z: -30 }, { x: 80, z: -30 }, 
        { x: -80, z: 30 }, { x: 80, z: 30 },
        { x: -60, z: 0 }, { x: 60, z: 0 }
    ];

    // Spawn 6 enemies (3 red team, 3 blue team)
    for (let i = 0; i < 6; i++) {
        const spawnPoint = enemySpawnPoints[i];
        const team = i < 3 ? 'red' : 'blue';
        createTeamEnemy(spawnPoint.x, spawnPoint.z, team);
    }
}

// Create team-based enemy
function createTeamEnemy(x, z, team) {
    // Create enemy body
    const enemyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.5, 8);
    const enemyMaterial = new THREE.MeshStandardMaterial({ 
        color: team === 'red' ? 0x8B0000 : 0x000080
    });
    const enemyMesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    
    enemyMesh.position.set(x, 1, z);
    enemyMesh.castShadow = true;
    
    // Add simple face
    const faceGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const faceMaterial = new THREE.MeshStandardMaterial({ color: 0xFFDBB5 });
    const face = new THREE.Mesh(faceGeometry, faceMaterial);
    face.position.y = 0.6;
    enemyMesh.add(face);
    
    // Add rifle
    const rifleGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.4);
    const rifleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const rifle = new THREE.Mesh(rifleGeometry, rifleMaterial);
    rifle.position.set(0.3, 0, 0.2);
    enemyMesh.add(rifle);
    
    enemiesGroup.add(enemyMesh);
    
    // Add enemy to game state
    const enemy = {
        mesh: enemyMesh,
        position: new THREE.Vector3(x, 1, z),
        health: 100,
        speed: 0.02,
        type: 'team',
        team: team,
        weapon: 'rifle',
        damage: 15,
        attackRange: 20,
        attackCooldown: 0,
        maxAttackCooldown: 2.0,
        lastAttackTime: 0,
        target: gameState.player.position,
        state: 'moving',
        aggroRange: 30
    };
    
    gameState.enemies.push(enemy);
}

// Spawn forest boss
function spawnForestBoss() {
    // Create boss at center of forest
    const bossGeometry = new THREE.CylinderGeometry(1, 1.5, 3, 8);
    const bossMaterial = new THREE.MeshStandardMaterial({ color: 0x4A4A4A });
    const bossMesh = new THREE.Mesh(bossGeometry, bossMaterial);
    
    bossMesh.position.set(0, 1.5, 0);
    bossMesh.castShadow = true;
    
    // Add boss details
    const eyeGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 1, 0.8);
    bossMesh.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 1, 0.8);
    bossMesh.add(rightEye);
    
    enemiesGroup.add(bossMesh);
    
    // Add boss to game state
    const boss = {
        mesh: bossMesh,
        position: new THREE.Vector3(0, 1.5, 0),
        health: 500, // Boss has lots of health
        speed: 0.01, // Slower but powerful
        type: 'boss',
        weapon: 'rocket',
        damage: 50,
        attackRange: 40,
        attackCooldown: 0,
        maxAttackCooldown: 4.0,
        lastAttackTime: 0,
        target: gameState.player.position,
        state: 'moving',
        aggroRange: 50
    };
    
    gameState.enemies.push(boss);
}

// Show team selection for Arena stage
function showTeamSelection() {
    // Clear existing checkpoint content
    gameMessageElement.innerHTML = '';
    
    // Create team selection UI
    const teamHeader = document.createElement('h2');
    teamHeader.textContent = 'Choose Your Team!';
    teamHeader.style.marginBottom = '20px';
    teamHeader.style.color = 'white';
    gameMessageElement.appendChild(teamHeader);
    
    const teamDesc = document.createElement('p');
    teamDesc.textContent = 'Select which team you want to fight for in the arena:';
    teamDesc.style.marginBottom = '30px';
    teamDesc.style.color = 'white';
    gameMessageElement.appendChild(teamDesc);
    
    // Team buttons container
    const teamsContainer = document.createElement('div');
    teamsContainer.style.display = 'flex';
    teamsContainer.style.gap = '30px';
    teamsContainer.style.marginBottom = '30px';
    
    // Red team button
    const redTeamButton = document.createElement('button');
    redTeamButton.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">🔴</div>
        <div style="font-size: 18px; font-weight: bold;">RED TEAM</div>
        <div style="font-size: 14px; margin-top: 5px;">Aggressive • High Damage</div>
    `;
    redTeamButton.style.cssText = `
        padding: 20px;
        background: linear-gradient(45deg, #e74c3c, #c0392b);
        border: none;
        border-radius: 10px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(231, 76, 60, 0.4);
        min-width: 150px;
    `;
    
    redTeamButton.addEventListener('mouseenter', () => {
        redTeamButton.style.transform = 'translateY(-3px)';
        redTeamButton.style.boxShadow = '0 8px 25px rgba(231, 76, 60, 0.6)';
    });
    
    redTeamButton.addEventListener('mouseleave', () => {
        redTeamButton.style.transform = 'translateY(0)';
        redTeamButton.style.boxShadow = '0 5px 15px rgba(231, 76, 60, 0.4)';
    });
    
    redTeamButton.onclick = () => selectTeam('red');
    
    // Blue team button
    const blueTeamButton = document.createElement('button');
    blueTeamButton.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">🔵</div>
        <div style="font-size: 18px; font-weight: bold;">BLUE TEAM</div>
        <div style="font-size: 14px; margin-top: 5px;">Tactical • High Defense</div>
    `;
    blueTeamButton.style.cssText = `
        padding: 20px;
        background: linear-gradient(45deg, #3498db, #2980b9);
        border: none;
        border-radius: 10px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 5px 15px rgba(52, 152, 219, 0.4);
        min-width: 150px;
    `;
    
    blueTeamButton.addEventListener('mouseenter', () => {
        blueTeamButton.style.transform = 'translateY(-3px)';
        blueTeamButton.style.boxShadow = '0 8px 25px rgba(52, 152, 219, 0.6)';
    });
    
    blueTeamButton.addEventListener('mouseleave', () => {
        blueTeamButton.style.transform = 'translateY(0)';
        blueTeamButton.style.boxShadow = '0 5px 15px rgba(52, 152, 219, 0.4)';
    });
    
    blueTeamButton.onclick = () => selectTeam('blue');
    
    teamsContainer.appendChild(redTeamButton);
    teamsContainer.appendChild(blueTeamButton);
    gameMessageElement.appendChild(teamsContainer);
    
    // Add back button
    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Checkpoint';
    backButton.style.cssText = `
        padding: 10px 20px;
        background: #666;
        border: none;
        border-radius: 5px;
        color: white;
        cursor: pointer;
        margin-bottom: 20px;
    `;
    backButton.onclick = () => {
        showCheckpoint();
    };
    gameMessageElement.appendChild(backButton);
    
    // Show current stats
    const statsContainer = document.createElement('div');
    statsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    statsContainer.style.padding = '15px';
    statsContainer.style.borderRadius = '5px';
    statsContainer.style.marginBottom = '20px';
    
    statsContainer.innerHTML = `
        <div style="color: white; text-align: center;">
            <div><strong>Your Current Stats:</strong></div>
            <div>Health: ${gameState.player.health} | Coins: ${gameState.player.coins} | Weapons: ${gameState.player.inventory.filter(i => i.type === 'weapon').length}</div>
        </div>
    `;
    gameMessageElement.appendChild(statsContainer);
    
    // Keep panel visible
    gameMessageElement.style.display = 'block';
}

// Select team and start arena
function selectTeam(team) {
    gameState.player.team = team;
    
    // Show team selection confirmation
    showPickupMessage(`You joined the ${team.toUpperCase()} team! Prepare for battle!`, false);
    
    // Position player on their team's side
    if (team === 'red') {
        gameState.player.position.set(-90, 1, 0);
        camera.position.set(-90, 1.6, 0);
    } else {
        gameState.player.position.set(90, 1, 0);
        camera.position.set(90, 1.6, 0);
    }
    
    // Hide team selection panel
    gameMessageElement.style.display = 'none';
    gameMessageElement.innerHTML = '';
    
    // Start arena combat
    gameContainer.requestPointerLock();
}

// Update function to handle floating animations for items
function updateItemAnimations(delta) {
    gameState.items.forEach(item => {
        if (item.mesh && item.mesh.userData) {
            const userData = item.mesh.userData;
            
            // Update floating position
            if (userData.baseY !== undefined && userData.floatSpeed !== undefined) {
                userData.floatTime += delta * userData.floatSpeed;
                const newY = userData.baseY + Math.sin(userData.floatTime) * 0.2;
                item.mesh.position.y = newY;
                item.position.y = newY;
            }
            
            // Update rotation (for coins and some items)
            if (userData.rotationSpeed !== undefined) {
                if (item.type === 'coin') {
                    // Coins rotate around Y axis
                    item.mesh.rotation.z += userData.rotationSpeed;
                } else {
                    // Other items might rotate differently
                    item.mesh.rotation.x += userData.rotationSpeed * 0.5;
                    item.mesh.rotation.y += userData.rotationSpeed;
                    item.mesh.rotation.z += userData.rotationSpeed * 0.3;
                }
            }
        }
    });
};

// Update function
function update(delta) {
    // Update player position
    updatePlayerPosition(delta);
    
    // Update enemies
    updateEnemies(delta);
    
    // Update item animations
    updateItemAnimations(delta);
    
    // Check collisions
    checkCollisions();
    
    // Check stage completion
    checkStageCompletion();
    
    // Update UI
    updateUI();
}

// Extend checkCollisions to handle new item types
function checkCollisions() {
    // Check item collisions
    for (let i = gameState.items.length - 1; i >= 0; i--) {
        const item = gameState.items[i];
        const distanceToPlayer = item.position.distanceTo(gameState.player.position);
        
        if (distanceToPlayer < 1.5) {
            // Handle collision based on item type
            switch(item.type) {
                case 'weapon':
                    const newWeapon = {
                        type: 'weapon',
                        weapon: item.weapon,
                        ammo: item.weapon.capacity // Start with full magazine
                    };
                    
                    gameState.player.inventory.push(newWeapon);
                    
                    // Auto-equip first weapon
                    if (gameState.player.currentWeaponIndex === -1) {
                        gameState.player.currentWeaponIndex = 0;
                        gameState.player.weapon = newWeapon;
                        updateWeaponVisual();
                    }
                    
                    // Display pickup message
                    showPickupMessage(`Picked up ${item.weapon.name}!`);
                    break;
                case 'ammo':
                    // Find weapon that uses this ammo
                    const weaponIndex = gameState.player.inventory.findIndex(
                        invItem => invItem.type === 'weapon' && invItem.weapon.ammoType === item.ammo.type
                    );
                    if (weaponIndex !== -1) {
                        gameState.player.inventory[weaponIndex].ammo += item.ammo.count;
                        showPickupMessage(`+${item.ammo.count} ${item.ammo.type} ammo!`);
                    } else {
                        // Add ammo to inventory if no matching weapon
                        gameState.player.inventory.push({
                            type: 'ammo',
                            ammoType: item.ammo.type,
                            count: item.ammo.count
                        });
                        showPickupMessage(`+${item.ammo.count} ${item.ammo.type} ammo!`);
                    }
                    break;
                case 'coin':
                    gameState.player.coins += item.value;
                    showPickupMessage(`+${item.value} coins!`);
                    break;
                case 'health':
                    // Restore health but don't exceed max
                    const oldHealth = gameState.player.health;
                    gameState.player.health = Math.min(100, gameState.player.health + item.value);
                    const healedAmount = gameState.player.health - oldHealth;
                    showPickupMessage(`+${healedAmount} health!`);
                    break;
                case 'trap':
                    if (item.visible) {
                        gameState.player.health -= item.damage;
                        showPickupMessage(`Trap damage: -${item.damage} health!`, true);
                    } else {
                        // Make trap visible when stepped on
                        item.visible = true;
                        item.mesh.material.opacity = 0.8;
                        gameState.player.health -= item.damage;
                        showPickupMessage(`Trap activated! -${item.damage} health!`, true);
                    }
                    break;
            }
            
            // Play pickup sound (would add actual sound implementation here)
            // playSound(item.type);
            
            // Remove item if not a trap
            if (item.type !== 'trap') {
                itemsGroup.remove(item.mesh);
                gameState.items.splice(i, 1);
            }
        }
    }
    
    // Check if player is dead
    if (gameState.player.health <= 0) {
        gameOver(false);
    }
}

// Function to show pickup messages
function showPickupMessage(message, isWarning = false) {
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.position = 'absolute';
    messageElement.style.top = '30%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.backgroundColor = isWarning ? 'rgba(231, 76, 60, 0.8)' : 'rgba(46, 204, 113, 0.8)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '10px 15px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontWeight = 'bold';
    messageElement.style.fontSize = '18px';
    messageElement.style.zIndex = '1000';
    messageElement.style.pointerEvents = 'none';
    messageElement.style.transition = 'opacity 1s';
    
    document.body.appendChild(messageElement);
    
    // Fade out and remove
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => messageElement.remove(), 1000);
    }, 1500);
}

// Start the game
function startGame() {
    console.log('Starting game...'); // Debug log
    gameState.gameStarted = true;
    startButton.style.display = 'none';
    
    // Add controls display
    addControlsDisplay();
    
    // Lock pointer for FPS controls
    gameContainer.requestPointerLock();
    
    // Start the timer for warehouse stage
    if (gameState.currentStage === STAGES.WAREHOUSE) {
        startTimer();
    }
}

// Ready for Stage 2 (triggered by U key)
function readyForStage2() {
    // Exit pointer lock
    if (document.pointerLockElement === gameContainer) {
        document.exitPointerLock();
    }
    
    // Stop timer
    stopTimer();
    
    // Go to checkpoint
    gameState.stageCompleted = true;
    showCheckpoint();
}

// Pause game
function pauseGame() {
    if (gameState.gameStarted && !gameState.gameOver) {
        // Display pause message
        gameMessageElement.textContent = 'Game Paused - Click to continue';
        gameMessageElement.style.display = 'block';
        
        // Add event listener to resume
        gameContainer.addEventListener('click', resumeGame, { once: true });
    }
}

// Resume game
function resumeGame() {
    if (gameState.gameStarted && !gameState.gameOver) {
        // Hide message
        gameMessageElement.style.display = 'none';
        
        // Lock pointer again
        gameContainer.requestPointerLock();
    }
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    
    if (gameState.gameStarted && gameState.pointerLocked) {
        updatePlayerPosition(delta);
        updateEnemies(delta);
        updateItemAnimations(delta);
        checkCollisions();
        checkStageCompletion();
        updateUI();

        // Update timer
        if (gameState.timerActive) {
            gameState.timer -= delta;
            if (gameState.timer <= 0) {
                gameState.timer = 0;
                gameState.timerActive = false;
                
                // Check if player has enough points/kills to proceed
                const minKills = 5;
                const minCoins = 50;
                const playerWon = gameState.player.kills >= minKills && gameState.player.coins >= minCoins;
                
                gameOver(playerWon);
            }
            updateTimer();
        }

        // Update enemy spawn timer for stage 1
        if (gameState.currentStage === STAGES.WAREHOUSE && !gameState.enemySpawned) {
            gameState.enemySpawnTimer -= delta;
            if (gameState.enemySpawnTimer <= 0) {
                spawnWarehouseEnemies();
                gameState.enemySpawned = true;
                showPickupMessage("Enemies have arrived! Watch out for knife-wielding attackers!", true);
            }
        }
    }
    
    renderer.render(scene, camera);
}

// Update player position based on keyboard input
function updatePlayerPosition(delta) {
    if (!gameState.gameStarted || !gameState.pointerLocked) return;

    // Get movement direction
    let moveX = 0;
    let moveZ = 0;

    if (gameState.keys['w'] || gameState.keys['arrowup']) moveZ -= 1;
    if (gameState.keys['s'] || gameState.keys['arrowdown']) moveZ += 1;
    if (gameState.keys['a'] || gameState.keys['arrowleft']) moveX -= 1;
    if (gameState.keys['d'] || gameState.keys['arrowright']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
        // Get camera direction
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0;
        cameraDirection.normalize();

        // Calculate right vector
        const rightVector = new THREE.Vector3();
        rightVector.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection);

        // Calculate movement
        const movement = new THREE.Vector3();
        movement.addScaledVector(cameraDirection, -moveZ * gameState.moveSpeed);
        movement.addScaledVector(rightVector, moveX * gameState.moveSpeed);

        // Try moving on X axis only
        let newPositionX = gameState.player.position.clone();
        newPositionX.x += movement.x;
        const playerBoxX = new THREE.Box3().setFromCenterAndSize(
            newPositionX,
            new THREE.Vector3(1, 2, 1)
        );
        let canMoveX = true;
        for (const wall of gameState.wallColliders) {
            if (playerBoxX.intersectsBox(wall)) {
                canMoveX = false;
                break;
            }
        }
        // Try moving on Z axis only
        let newPositionZ = gameState.player.position.clone();
        newPositionZ.z += movement.z;
        const playerBoxZ = new THREE.Box3().setFromCenterAndSize(
            newPositionZ,
            new THREE.Vector3(1, 2, 1)
        );
        let canMoveZ = true;
        for (const wall of gameState.wallColliders) {
            if (playerBoxZ.intersectsBox(wall)) {
                canMoveZ = false;
                break;
            }
        }
        // Apply movement if possible
        if (canMoveX) {
            gameState.player.position.x = newPositionX.x;
        }
        if (canMoveZ) {
            gameState.player.position.z = newPositionZ.z;
        }
        // Always update camera position to match player
        camera.position.copy(gameState.player.position);
    }
}

// Constrain player position within level boundaries
function constrainPlayerPosition() {
    switch(gameState.currentStage) {
        case STAGES.WAREHOUSE:
            gameState.player.position.x = Math.max(-49, Math.min(49, gameState.player.position.x));
            gameState.player.position.z = Math.max(-49, Math.min(49, gameState.player.position.z));
            break;
        case STAGES.ARENA:
            gameState.player.position.x = Math.max(-98, Math.min(98, gameState.player.position.x));
            gameState.player.position.z = Math.max(-48, Math.min(48, gameState.player.position.z));
            break;
        case STAGES.FOREST:
            gameState.player.position.x = Math.max(-99, Math.min(99, gameState.player.position.x));
            gameState.player.position.z = Math.max(-99, Math.min(99, gameState.player.position.z));
            break;
    }
    
    // Update camera position to match player
    camera.position.x = gameState.player.position.x;
    camera.position.z = gameState.player.position.z;
    camera.position.y = gameState.player.position.y + 0.6; // Eye level
}

// Update enemies
function updateEnemies(delta) {
    gameState.enemies.forEach((enemy, index) => {
        if (enemy.state === 'dead') return;
        
        const distanceToPlayer = enemy.position.distanceTo(gameState.player.position);
        
        // Update attack cooldown
        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown -= delta;
        }
        
        // Handle retreating state
        if (enemy.state === 'retreating') {
            // Move away from player
            const direction = new THREE.Vector3()
                .subVectors(enemy.position, gameState.player.position)
                .normalize();
            
            // Move faster when retreating
            enemy.position.add(direction.multiplyScalar(enemy.speed * 2));
            enemy.mesh.position.copy(enemy.position);
            
            // Face away from player while retreating
            enemy.mesh.lookAt(
                enemy.position.x + direction.x,
                enemy.position.y,
                enemy.position.z + direction.z
            );
            
            return; // Skip other behaviors when retreating
        }
        
        // AI behavior based on distance and enemy type
        if (distanceToPlayer <= enemy.aggroRange) {
            // Player is within aggro range
            
            if (enemy.type === 'knife') {
                // Knife enemy: rush toward player
                if (distanceToPlayer > enemy.attackRange) {
                    // Move toward player aggressively
                    const direction = new THREE.Vector3()
                        .subVectors(gameState.player.position, enemy.position)
                        .normalize();
                    
                    direction.y = 0; // Keep on ground
                    
                    // Check for wall collisions
                    const newPosition = enemy.position.clone().add(direction.multiplyScalar(enemy.speed));
                    const enemyBox = new THREE.Box3().setFromCenterAndSize(
                        newPosition,
                        new THREE.Vector3(1, 2, 1)
                    );
                    
                    let canMove = true;
                    for (const wall of gameState.wallColliders) {
                        if (enemyBox.intersectsBox(wall)) {
                            canMove = false;
                            break;
                        }
                    }
                    
                    if (canMove) {
                        enemy.position.copy(newPosition);
                        enemy.mesh.position.copy(enemy.position);
                    }
                    
                    // Face player
                    enemy.mesh.lookAt(gameState.player.position);
                    enemy.state = 'moving';
                } else {
                    // Close enough to attack with knife
                    if (enemy.attackCooldown <= 0) {
                        // Attack!
                        gameState.player.health -= enemy.damage;
                        enemy.attackCooldown = enemy.maxAttackCooldown;
                        
                        // Create attack effect
                        createEnemyAttackEffect(enemy.position);
                        
                        // Show damage message
                        showPickupMessage(`Knife attack! -${enemy.damage} health!`, true);
                        
                        enemy.state = 'attacking';
                        
                        // Brief pause after attacking
                        setTimeout(() => {
                            if (enemy.state === 'attacking') {
                                enemy.state = 'moving';
                            }
                        }, 500);
                    }
                    
                    // Face player
                    enemy.mesh.lookAt(gameState.player.position);
                }
            } else if (enemy.type === 'gun') {
                // Gun enemy: keep distance and shoot
                if (distanceToPlayer <= enemy.attackRange && distanceToPlayer > 5) {
                    // Good shooting distance - attack
                    if (enemy.attackCooldown <= 0) {
                        // Check line of sight (simple raycast)
                        const direction = new THREE.Vector3()
                            .subVectors(gameState.player.position, enemy.position)
                            .normalize();
                        
                        const raycaster = new THREE.Raycaster(enemy.position, direction);
                        const intersects = raycaster.intersectObjects(terrainGroup.children);
                        
                        // If no walls blocking, shoot
                        if (intersects.length === 0 || intersects[0].distance > distanceToPlayer) {
                            gameState.player.health -= enemy.damage;
                            enemy.attackCooldown = enemy.maxAttackCooldown;
                            
                            // Create shooting effect
                            createEnemyShootEffect(enemy.position, gameState.player.position);
                            
                            showPickupMessage(`Shot by enemy! -${enemy.damage} health!`, true);
                            
                            enemy.state = 'attacking';
                            setTimeout(() => {
                                if (enemy.state === 'attacking') {
                                    enemy.state = 'moving';
                                }
                            }, 300);
                        }
                    }
                    
                    // Face player
                    enemy.mesh.lookAt(gameState.player.position);
                } else if (distanceToPlayer > enemy.attackRange) {
                    // Too far, move closer (but not too close)
                    const direction = new THREE.Vector3()
                        .subVectors(gameState.player.position, enemy.position)
                        .normalize();
                    
                    direction.y = 0;
                    enemy.position.add(direction.multiplyScalar(enemy.speed));
                    enemy.mesh.position.copy(enemy.position);
                    enemy.mesh.lookAt(gameState.player.position);
                    enemy.state = 'moving';
                } else {
                    // Too close, back away
                    const direction = new THREE.Vector3()
                        .subVectors(enemy.position, gameState.player.position)
                        .normalize();
                    
                    direction.y = 0;
                    enemy.position.add(direction.multiplyScalar(enemy.speed * 0.5));
                    enemy.mesh.position.copy(enemy.position);
                    enemy.mesh.lookAt(gameState.player.position);
                    enemy.state = 'moving';
                }
            }
        } else {
            // Player is out of range, patrol or idle
            enemy.state = 'moving';
            
            // Simple patrol: move randomly
            if (Math.random() < 0.01) { // 1% chance per frame to change direction
                const randomDirection = new THREE.Vector3(
                    (Math.random() - 0.5) * 2,
                    0,
                    (Math.random() - 0.5) * 2
                ).normalize();
                
                enemy.position.add(randomDirection.multiplyScalar(enemy.speed * 0.3));
                enemy.mesh.position.copy(enemy.position);
                
                // Keep enemies within warehouse bounds
                enemy.position.x = Math.max(-48, Math.min(48, enemy.position.x));
                enemy.position.z = Math.max(-48, Math.min(48, enemy.position.z));
                enemy.mesh.position.copy(enemy.position);
            }
        }
        
        // Keep enemies within stage bounds
        enemy.position.x = Math.max(-48, Math.min(48, enemy.position.x));
        enemy.position.z = Math.max(-48, Math.min(48, enemy.position.z));
        enemy.mesh.position.copy(enemy.position);
    });
}

// Check if stage is completed
function checkStageCompletion() {
    switch(gameState.currentStage) {
        case STAGES.WAREHOUSE:
            // Check if player has collected enough coins and reached the exit
            const exitPosition = new THREE.Vector3(0, 0, -90);
            const distanceToExit = gameState.player.position.distanceTo(exitPosition);
            
            if (gameState.player.coins >= 50 && distanceToExit < 5) {
                stopTimer();
                showCheckpoint();
            }
            break;
        case STAGES.ARENA:
            // Stage 2 completes when all enemies of the opposite team are defeated
            const oppositeTeam = gameState.player.team === 'red' ? 'blue' : 'red';
            if (!gameState.enemies.some(enemy => enemy.team === oppositeTeam)) {
                gameState.stageCompleted = true;
                showCheckpoint();
            }
            break;
        case STAGES.FOREST:
            // Stage 3 completes when the boss is defeated
            if (!gameState.enemies.some(enemy => enemy.type === 'boss')) {
                gameState.stageCompleted = true;
                gameOver(true);
            }
            break;
    }
}

// Show checkpoint between stages
function showCheckpoint() {
    // Exit pointer lock
    if (document.pointerLockElement === gameContainer) {
        document.exitPointerLock();
    }
    
    // Set up checkpoint UI
    gameMessageElement.innerHTML = '';
    gameMessageElement.style.display = 'block';
    
    // Create checkpoint header
    const checkpointHeader = document.createElement('h2');
    checkpointHeader.textContent = `Stage ${gameState.currentStage + 1} Completed!`;
    checkpointHeader.style.marginBottom = '10px';
    gameMessageElement.appendChild(checkpointHeader);
    
    // Create checkpoint description
    const checkpointDesc = document.createElement('p');
    checkpointDesc.textContent = 'Purchase items before proceeding to the next stage:';
    checkpointDesc.style.marginBottom = '15px';
    gameMessageElement.appendChild(checkpointDesc);
    
    // Create store container
    const storeContainer = document.createElement('div');
    storeContainer.className = 'checkpoint-store';
    storeContainer.style.display = 'grid';
    storeContainer.style.gridTemplateColumns = 'repeat(2, 1fr)';
    storeContainer.style.gap = '10px';
    storeContainer.style.marginBottom = '20px';
    storeContainer.style.maxHeight = '300px';
    storeContainer.style.overflowY = 'auto';
    storeContainer.style.padding = '10px';
    storeContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    storeContainer.style.borderRadius = '5px';
    
    // Get available items based on current stage
    const storeItems = getCheckpointItems();
    
    // Add items to store
    storeItems.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = 'store-item';
        itemElement.style.backgroundColor = 'rgba(50, 50, 50, 0.7)';
        itemElement.style.padding = '10px';
        itemElement.style.borderRadius = '5px';
        itemElement.style.display = 'flex';
        itemElement.style.flexDirection = 'column';
        itemElement.style.alignItems = 'center';
        itemElement.style.pointerEvents = 'auto';
        itemElement.style.cursor = 'pointer';
        
        // Item name
        const itemName = document.createElement('div');
        itemName.textContent = item.name;
        itemName.style.fontWeight = 'bold';
        itemName.style.marginBottom = '5px';
        itemElement.appendChild(itemName);
        
        // Item description
        const itemDesc = document.createElement('div');
        itemDesc.textContent = item.description;
        itemDesc.style.fontSize = '12px';
        itemDesc.style.marginBottom = '5px';
        itemElement.appendChild(itemDesc);
        
        // Item price
        const itemPrice = document.createElement('div');
        itemPrice.textContent = `${item.price} coins`;
        itemPrice.style.color = gameState.player.coins >= item.price ? '#2ecc71' : '#e74c3c';
        itemElement.appendChild(itemPrice);
        
        // Add click event to purchase item
        itemElement.addEventListener('click', () => {
            if (gameState.player.coins >= item.price) {
                gameState.player.coins -= item.price;
                
                // Apply item effect
                applyItemEffect(item);
                
                // Update UI
                updateUI();
                
                // Update price color for all items (some might no longer be affordable)
                const priceElements = storeContainer.querySelectorAll('.store-item > div:last-child');
                priceElements.forEach(priceElement => {
                    const itemPrice = parseInt(priceElement.textContent);
                    priceElement.style.color = gameState.player.coins >= itemPrice ? '#2ecc71' : '#e74c3c';
                });
                
                // Show purchase confirmation
                const confirmation = document.createElement('div');
                confirmation.textContent = `Purchased ${item.name}!`;
                confirmation.style.position = 'absolute';
                confirmation.style.top = '10px';
                confirmation.style.left = '50%';
                confirmation.style.transform = 'translateX(-50%)';
                confirmation.style.backgroundColor = 'rgba(46, 204, 113, 0.8)';
                confirmation.style.padding = '10px';
                confirmation.style.borderRadius = '5px';
                confirmation.style.transition = 'opacity 2s';
                
                gameMessageElement.appendChild(confirmation);
                
                // Fade out and remove after 2 seconds
                setTimeout(() => {
                    confirmation.style.opacity = '0';
                    setTimeout(() => confirmation.remove(), 2000);
                }, 1000);
            } else {
                // Show "not enough coins" message
                const errorMsg = document.createElement('div');
                errorMsg.textContent = 'Not enough coins!';
                errorMsg.style.position = 'absolute';
                errorMsg.style.top = '10px';
                errorMsg.style.left = '50%';
                errorMsg.style.transform = 'translateX(-50%)';
                errorMsg.style.backgroundColor = 'rgba(231, 76, 60, 0.8)';
                errorMsg.style.padding = '10px';
                errorMsg.style.borderRadius = '5px';
                errorMsg.style.transition = 'opacity 2s';
                
                gameMessageElement.appendChild(errorMsg);
                
                // Fade out and remove after 2 seconds
                setTimeout(() => {
                    errorMsg.style.opacity = '0';
                    setTimeout(() => errorMsg.remove(), 2000);
                }, 1000);
            }
        });
        
        storeContainer.appendChild(itemElement);
    });
    
    gameMessageElement.appendChild(storeContainer);
    
    // Show player stats
    const statsContainer = document.createElement('div');
    statsContainer.className = 'player-checkpoint-stats';
    statsContainer.style.display = 'flex';
    statsContainer.style.justifyContent = 'space-between';
    statsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    statsContainer.style.padding = '10px';
    statsContainer.style.borderRadius = '5px';
    statsContainer.style.marginBottom = '20px';
    
    // Health stat
    const healthStat = document.createElement('div');
    healthStat.textContent = `Health: ${gameState.player.health}`;
    statsContainer.appendChild(healthStat);
    
    // Coins stat
    const coinsStat = document.createElement('div');
    coinsStat.textContent = `Coins: ${gameState.player.coins}`;
    coinsStat.id = 'checkpoint-coins';
    statsContainer.appendChild(coinsStat);
    
    // Kills stat
    const killsStat = document.createElement('div');
    killsStat.textContent = `Kills: ${gameState.player.kills}`;
    statsContainer.appendChild(killsStat);
    
    gameMessageElement.appendChild(statsContainer);
    
    // Create proceed button
    const proceedButton = document.createElement('button');
    proceedButton.textContent = `Proceed to Stage ${gameState.currentStage + 2}`;
    proceedButton.style.marginTop = '15px';
    proceedButton.style.padding = '10px 20px';
    proceedButton.style.pointerEvents = 'auto';
    proceedButton.style.backgroundColor = '#e74c3c';
    proceedButton.style.color = 'white';
    proceedButton.style.border = 'none';
    proceedButton.style.borderRadius = '5px';
    proceedButton.style.cursor = 'pointer';
    
    proceedButton.onclick = () => {
        // Advance to next stage
        gameState.currentStage++;
        gameState.stageCompleted = false;
        
        // Special handling for Arena stage (team selection)
        if (gameState.currentStage === STAGES.ARENA) {
            setupStage(gameState.currentStage);
            showTeamSelection();
        } else {
            setupStage(gameState.currentStage);
            
            // Hide message and remove button
            gameMessageElement.style.display = 'none';
            gameMessageElement.innerHTML = '';
            
            // Lock pointer again
            gameContainer.requestPointerLock();
        }
    };
    
    gameMessageElement.appendChild(proceedButton);
}

// Get available items for checkpoint based on current stage
function getCheckpointItems() {
    const items = [];
    
    // Items available after stage 1 (going into stage 2)
    if (gameState.currentStage === STAGES.WAREHOUSE) {
        items.push(
            {
                name: "Health Pack",
                description: "Restores 50 health points",
                price: 20,
                effect: "heal",
                value: 50
            },
            {
                name: "Rifle Ammo",
                description: "30 rounds for rifle weapons",
                price: 15,
                effect: "ammo",
                ammoType: "rifle",
                value: 30
            },
            {
                name: "Rocket Ammo",
                description: "1 rocket for launcher",
                price: 30,
                effect: "ammo",
                ammoType: "rocket",
                value: 1
            },
            {
                name: "Body Armor",
                description: "Increases max health by 25",
                price: 35,
                effect: "armor",
                value: 25
            }
        );
    }
    // Items available after stage 2 (going into stage 3)
    else if (gameState.currentStage === STAGES.ARENA) {
        items.push(
            {
                name: "Health Pack",
                description: "Restores 50 health points",
                price: 20,
                effect: "heal",
                value: 50
            },
            {
                name: "Rifle Ammo",
                description: "30 rounds for rifle weapons",
                price: 15,
                effect: "ammo",
                ammoType: "rifle",
                value: 30
            },
            {
                name: "Rocket Ammo",
                description: "1 rocket for launcher",
                price: 30,
                effect: "ammo",
                ammoType: "rocket",
                value: 1
            },
            {
                name: "Grenade",
                description: "Explosive device with 50 damage",
                price: 25,
                effect: "item",
                item: ITEMS.GRENADE
            },
            {
                name: "Molotov",
                description: "Fire bomb that deals damage over time",
                price: 20,
                effect: "item",
                item: ITEMS.MOLOTOV
            },
            {
                name: "Incendiary Ammo",
                description: "10 special rounds that deal fire damage",
                price: 35,
                effect: "ammo_special",
                ammoType: "rifle",
                value: 10,
                damage: 35
            },
            {
                name: "Explosive Ammo",
                description: "10 special rounds with explosive damage",
                price: 40,
                effect: "ammo_special",
                ammoType: "rifle",
                value: 10,
                damage: 40
            },
            {
                name: "Speed Boost",
                description: "Increases movement speed by 25%",
                price: 30,
                effect: "speed",
                value: 0.025
            }
        );
    }
    
    return items;
}

// Apply purchased item effect
function applyItemEffect(item) {
    switch(item.effect) {
        case "heal":
            // Restore health but don't exceed max
            gameState.player.health = Math.min(100, gameState.player.health + item.value);
            break;
            
        case "ammo":
            // Add ammo to existing weapon or inventory
            const weaponIndex = gameState.player.inventory.findIndex(
                invItem => invItem.type === 'weapon' && invItem.weapon.ammoType === item.ammoType
            );
            
            if (weaponIndex !== -1) {
                gameState.player.inventory[weaponIndex].ammo += item.value;
            } else {
                // Add ammo to inventory if no matching weapon
                gameState.player.inventory.push({
                    type: 'ammo',
                    ammoType: item.ammoType,
                    count: item.value
                });
            }
            break;
            
        case "armor":
            // Increase max health
            gameState.player.health += item.value;
            break;
            
        case "item":
            // Add special item to inventory
            gameState.player.inventory.push({
                type: 'item',
                name: item.name,
                item: item.item
            });
            break;
            
        case "ammo_special":
            // Add special ammo to inventory
            gameState.player.inventory.push({
                type: 'ammo_special',
                name: item.name,
                ammoType: item.ammoType,
                count: item.value,
                damage: item.damage
            });
            break;
            
        case "speed":
            // Increase player speed
            gameState.player.speed += item.value;
            break;
    }
    
    // Update the coins display in the checkpoint stats
    const coinsElement = document.getElementById('checkpoint-coins');
    if (coinsElement) {
        coinsElement.textContent = `Coins: ${gameState.player.coins}`;
    }
}

// Game over
function gameOver(playerWon = false) {
    gameState.gameOver = true;
    gameState.timerActive = false;
    
    // Exit pointer lock
    if (document.pointerLockElement === gameContainer) {
        document.exitPointerLock();
    }
    
    // Show game over message
    const message = playerWon ? 
        "Stage Complete! Prepare for the next challenge!" : 
        "Time's up! Better luck next time!";
    
    showPickupMessage(message, !playerWon);
    
    // If player won, transition to next stage after a delay
    if (playerWon) {
        setTimeout(() => {
            if (gameState.currentStage === STAGES.WAREHOUSE) {
                // Transition to Stage 2
                gameState.currentStage = STAGES.ARENA;
                setupStage(STAGES.ARENA);
                showTeamSelection();
            } else if (gameState.currentStage === STAGES.ARENA) {
                // Show "Coming Soon" message for Stage 3
                showPickupMessage("Stage 3: The Billionaire Hunter - Coming Soon!", false);
                setTimeout(() => {
                    // Reset to Stage 1 for now
                    gameState.currentStage = STAGES.WAREHOUSE;
                    setupStage(STAGES.WAREHOUSE);
                }, 3000);
            }
        }, 2000);
    } else {
        // Reset current stage after a delay
        setTimeout(() => {
            setupStage(gameState.currentStage);
        }, 2000);
    }
}

// Update UI elements
function updateUI() {
    healthValueElement.textContent = gameState.player.health;
    coinsValueElement.textContent = gameState.player.coins;
    
    // Update ammo count and weapon name for currently equipped weapon
    const currentWeapon = gameState.player.weapon;
    if (currentWeapon) {
        ammoValueElement.textContent = `${currentWeapon.ammo}/${currentWeapon.weapon.capacity}`;
        
        // Show current weapon name
        let weaponNameElement = document.getElementById('current-weapon');
        if (!weaponNameElement) {
            weaponNameElement = document.createElement('div');
            weaponNameElement.id = 'current-weapon';
            weaponNameElement.style.position = 'absolute';
            weaponNameElement.style.bottom = '60px';
            weaponNameElement.style.right = '20px';
            weaponNameElement.style.color = 'white';
            weaponNameElement.style.fontSize = '18px';
            weaponNameElement.style.fontFamily = 'Arial, sans-serif';
            weaponNameElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
            document.getElementById('game-container').appendChild(weaponNameElement);
        }
        weaponNameElement.textContent = currentWeapon.weapon.name;
        
        // Show reload status
        if (gameState.player.isReloading) {
            weaponNameElement.textContent += ' (Reloading...)';
            weaponNameElement.style.color = 'yellow';
        } else {
            weaponNameElement.style.color = 'white';
        }
    } else {
        ammoValueElement.textContent = '0/0';
        const weaponNameElement = document.getElementById('current-weapon');
        if (weaponNameElement) {
            weaponNameElement.textContent = 'No Weapon';
        }
    }
    
    // Update inventory display
    inventoryElement.innerHTML = '';
    gameState.player.inventory.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = `inventory-item ${item.type}`;
        
        if (item.type === 'weapon') {
            const weaponNumber = gameState.player.inventory.filter(inv => inv.type === 'weapon').indexOf(item) + 1;
            itemElement.textContent = `${weaponNumber}. ${item.weapon.name}: ${item.ammo}`;
            
            // Highlight current weapon
            if (item === gameState.player.weapon) {
                itemElement.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
                itemElement.style.border = '1px solid yellow';
            }
        } else if (item.type === 'ammo') {
            itemElement.textContent = `${item.ammoType} Ammo: ${item.count}`;
        } else {
            itemElement.textContent = item.name;
        }
        
        inventoryElement.appendChild(itemElement);
    });
}

// Event Handlers
function handleKeyDown(e) {
    const key = e.key.toLowerCase();
    gameState.keys[key] = true;
    
    // Handle weapon switching (1-5 keys)
    if (['1', '2', '3', '4', '5'].includes(key)) {
        const weaponIndex = parseInt(key) - 1;
        switchWeapon(weaponIndex);
    }
    
    // Handle reload (R key)
    if (key === 'r') {
        reloadWeapon();
    }
    
    // Handle ready for stage 2 (U key)
    if (key === 'u' && gameState.currentStage === STAGES.WAREHOUSE && gameState.gameStarted) {
        readyForStage2();
    }
    
    console.log('Key pressed:', key, 'Keys state:', gameState.keys); // Debug log
}

function handleKeyUp(e) {
    const key = e.key.toLowerCase();
    gameState.keys[key] = false;
    gameState.keys[e.key.toLowerCase()] = false;
}

function handleMouseMove(e) {
    if (gameState.pointerLocked) {
        // Update camera rotation based on mouse movement
        const sensitivity = 0.002;
        
        // Horizontal rotation (y-axis)
        camera.rotation.y -= e.movementX * sensitivity;
        
        // Vertical rotation (x-axis), with limits to prevent flipping
        camera.rotation.x -= e.movementY * sensitivity;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }
}

function handleMouseDown(e) {
    if (e.button === 0) { // Left mouse button
        mouseDown = true;
        
        // If game is not started or pointer is not locked, just return
        if (!gameState.gameStarted || !gameState.pointerLocked) return;
        
        // Don't shoot if reloading
        if (gameState.player.isReloading) return;
        
        // Handle shooting
        const currentWeapon = gameState.player.weapon;
        if (currentWeapon && currentWeapon.ammo > 0) {
            // Reduce ammo
            currentWeapon.ammo--;
            
            // Create muzzle flash effect
            createMuzzleFlash();
            
            // Add weapon recoil animation
            if (weaponObject) {
                const originalPosition = weaponObject.position.clone();
                weaponObject.position.z += 0.05; // Recoil back
                
                setTimeout(() => {
                    if (weaponObject) {
                        weaponObject.position.copy(originalPosition);
                    }
                }, 100);
            }
            
            // Create raycaster for shooting
            raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
            
            // Check for intersections with enemies
            const intersects = raycaster.intersectObjects(enemiesGroup.children);
            
            if (intersects.length > 0) {
                // Find the corresponding enemy
                const hitMesh = intersects[0].object;
                const enemyIndex = gameState.enemies.findIndex(enemy => enemy.mesh === hitMesh);
                
                if (enemyIndex !== -1) {
                    const enemy = gameState.enemies[enemyIndex];
                    
                    // Apply damage
                    enemy.health -= currentWeapon.weapon.damage;
                    
                    // Create hit effect
                    createHitEffect(intersects[0].point);
                    
                    if (enemy.health <= 0) {
                        // Enemy killed
                        gameState.player.kills++;
                        
                        // Remove enemy mesh and from array
                        enemiesGroup.remove(enemy.mesh);
                        gameState.enemies.splice(enemyIndex, 1);
                        
                        // Drop loot
                        if (Math.random() < 0.3) {
                            // Create a coin
                            const coinGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.05, 16);
                            const coinMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00 });
                            const coinMesh = new THREE.Mesh(coinGeometry, coinMaterial);
                            
                            coinMesh.position.copy(enemy.position);
                            coinMesh.position.y = 0.5;
                            coinMesh.rotation.x = Math.PI / 2;
                            coinMesh.castShadow = true;
                            
                            // Add floating animation
                            coinMesh.userData = {
                                baseY: 0.5,
                                floatSpeed: 1.0,
                                floatTime: Math.random() * Math.PI * 2,
                                rotationSpeed: 0.05
                            };
                            
                            itemsGroup.add(coinMesh);
                            
                            // Add to game state
                            gameState.items.push({
                                type: 'coin',
                                value: 10,
                                position: new THREE.Vector3().copy(enemy.position).setY(0.5),
                                mesh: coinMesh
                            });
                        }
                    }
                }
            } else {
                // Create bullet impact effect on walls/terrain
                const wallIntersects = raycaster.intersectObjects(terrainGroup.children);
                if (wallIntersects.length > 0) {
                    createBulletImpact(wallIntersects[0].point, wallIntersects[0].face.normal);
                }
            }
            
            // Update UI
            updateUI();
        } else if (currentWeapon && currentWeapon.ammo === 0) {
            // Auto-reload when out of ammo
            reloadWeapon();
        }
    }
}

function handleMouseUp(e) {
    if (e.button === 0) { // Left mouse button
        mouseDown = false;
    }
}

// Weapon switching function
function switchWeapon(weaponIndex) {
    const weapons = gameState.player.inventory.filter(item => item.type === 'weapon');
    
    if (weaponIndex < weapons.length) {
        gameState.player.currentWeaponIndex = weaponIndex;
        gameState.player.weapon = weapons[weaponIndex];
        
        // Update weapon visual
        updateWeaponVisual();
        
        // Show weapon switch message
        showPickupMessage(`Switched to ${weapons[weaponIndex].weapon.name}`);
    }
}

// Reload weapon function
function reloadWeapon() {
    if (gameState.player.isReloading) return;
    
    const currentWeapon = gameState.player.weapon;
    if (!currentWeapon) return;
    
    // Check if we have ammo to reload
    const ammoItem = gameState.player.inventory.find(item => 
        item.type === 'ammo' && item.ammoType === currentWeapon.weapon.ammoType
    );
    
    if (!ammoItem || ammoItem.count === 0) {
        showPickupMessage("No ammo to reload!", true);
        return;
    }
    
    // Start reload process
    gameState.player.isReloading = true;
    gameState.player.reloadTime = 2.0; // 2 seconds reload time
    
    showPickupMessage("Reloading...");
    
    // Play reload animation
    playReloadAnimation();
    
    setTimeout(() => {
        if (gameState.player.isReloading) {
            // Calculate how much ammo to reload
            const ammoNeeded = currentWeapon.weapon.capacity - currentWeapon.ammo;
            const ammoToReload = Math.min(ammoNeeded, ammoItem.count);
            
            // Transfer ammo
            currentWeapon.ammo += ammoToReload;
            ammoItem.count -= ammoToReload;
            
            // Remove ammo item if empty
            if (ammoItem.count === 0) {
                const index = gameState.player.inventory.indexOf(ammoItem);
                gameState.player.inventory.splice(index, 1);
            }
            
            gameState.player.isReloading = false;
            showPickupMessage("Reload complete!");
            updateUI();
        }
    }, 2000);
}

// Update weapon visual in first person view
function updateWeaponVisual() {
    // Clear existing weapon
    while(weaponGroup.children.length > 0) {
        weaponGroup.remove(weaponGroup.children[0]);
    }
    
    const currentWeapon = gameState.player.weapon;
    if (!currentWeapon) return;
    
    // Create weapon group for animations
    const weaponMesh = new THREE.Group();
    
    // Create distinct weapon models based on type
    switch(currentWeapon.weapon.model) {
        case 'rifle1': // AK-74 - Classic assault rifle
            createAK74Model(weaponMesh);
            break;
        case 'rifle2': // QBB95 - Bullpup design
            createQBB95Model(weaponMesh);
            break;
        case 'rifle3': // AKM - Heavy assault rifle
            createAKMModel(weaponMesh);
            break;
        case 'rifle4': // L86A2 - Light machine gun
            createL86A2Model(weaponMesh);
            break;
        case 'rifle5': // AUG A3 - Modern bullpup
            createAUGA3Model(weaponMesh);
            break;
        case 'launcher': // Rocket Launcher
            createRocketLauncherModel(weaponMesh);
            break;
        default:
            createDefaultWeaponModel(weaponMesh);
    }
    
    // Position weapon in first person view
    weaponMesh.position.set(0.3, -0.3, -0.8);
    weaponMesh.rotation.set(0, 0, 0);
    
    weaponGroup.add(weaponMesh);
    weaponObject = weaponMesh;
}

// Create AK-74 model (brown/wood finish)
function createAK74Model(weaponGroup) {
    // Main body
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.12, 1.0);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    // Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.4, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.02, 0.7);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.3);
    const stockMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.02, -0.65);
    weaponGroup.add(stock);
    
    // Magazine
    const magGeometry = new THREE.BoxGeometry(0.04, 0.15, 0.2);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.15, 0.1);
    magazine.userData.isMagazine = true;
    weaponGroup.add(magazine);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.08);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.12, -0.1);
    weaponGroup.add(grip);
}

// Create QBB95 model (dark gray, bullpup design)
function createQBB95Model(weaponGroup) {
    // Main body (longer, bullpup style)
    const bodyGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    // Barrel with bipod
    const barrelGeometry = new THREE.CylinderGeometry(0.018, 0.018, 0.5, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.02, 0.85);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
    
    // Bipod legs
    const bipodGeometry = new THREE.CylinderGeometry(0.005, 0.005, 0.15, 6);
    const bipodMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const bipodLeft = new THREE.Mesh(bipodGeometry, bipodMaterial);
    bipodLeft.position.set(-0.08, -0.1, 0.6);
    bipodLeft.rotation.z = Math.PI / 6;
    weaponGroup.add(bipodLeft);
    
    const bipodRight = new THREE.Mesh(bipodGeometry, bipodMaterial);
    bipodRight.position.set(0.08, -0.1, 0.6);
    bipodRight.rotation.z = -Math.PI / 6;
    weaponGroup.add(bipodRight);
    
    // Magazine (drum style)
    const magGeometry = new THREE.CylinderGeometry(0.06, 0.06, 0.08, 16);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.12, 0.2);
    magazine.userData.isMagazine = true;
    weaponGroup.add(magazine);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.06);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x2F4F4F });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.1, 0.4);
    weaponGroup.add(grip);
}

// Create AKM model (olive green, heavy)
function createAKMModel(weaponGroup) {
    // Main body (thicker than AK-74)
    const bodyGeometry = new THREE.BoxGeometry(0.09, 0.14, 1.1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x556B2F });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    // Heavy barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.03, 0.75);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
    
    // Muzzle brake
    const muzzleGeometry = new THREE.CylinderGeometry(0.025, 0.02, 0.08, 8);
    const muzzleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const muzzle = new THREE.Mesh(muzzleGeometry, muzzleMaterial);
    muzzle.position.set(0, 0.03, 1.15);
    muzzle.rotation.x = Math.PI / 2;
    weaponGroup.add(muzzle);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.07, 0.09, 0.35);
    const stockMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.01, -0.7);
    weaponGroup.add(stock);
    
    // Magazine (curved)
    const magGeometry = new THREE.BoxGeometry(0.045, 0.18, 0.25);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.16, 0.05);
    magazine.rotation.x = -0.2; // Slight curve
    magazine.userData.isMagazine = true;
    weaponGroup.add(magazine);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.045, 0.14, 0.09);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.13, -0.15);
    weaponGroup.add(grip);
}

// Create L86A2 model (purple/black, light machine gun)
function createL86A2Model(weaponGroup) {
    // Main body (long and sleek)
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.11, 1.3);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x800080 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    // Long barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.016, 0.016, 0.6, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x0a0a0a });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.02, 0.95);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
    
    // Carrying handle
    const handleGeometry = new THREE.TorusGeometry(0.04, 0.008, 6, 12, Math.PI);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.set(0, 0.08, 0.2);
    handle.rotation.x = Math.PI / 2;
    weaponGroup.add(handle);
    
    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.06, 0.08, 0.25);
    const stockMaterial = new THREE.MeshStandardMaterial({ color: 0x4B0082 });
    const stock = new THREE.Mesh(stockGeometry, stockMaterial);
    stock.position.set(0, -0.01, -0.6);
    weaponGroup.add(stock);
    
    // Magazine (long)
    const magGeometry = new THREE.BoxGeometry(0.04, 0.2, 0.15);
    const magMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.17, 0.1);
    magazine.userData.isMagazine = true;
    weaponGroup.add(magazine);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.07);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x800080 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.11, -0.1);
    weaponGroup.add(grip);
}

// Create AUG A3 model (orange, modern bullpup)
function createAUGA3Model(weaponGroup) {
    // Main body (futuristic bullpup)
    const bodyGeometry = new THREE.BoxGeometry(0.09, 0.12, 1.1);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    // Barrel with integrated scope
    const barrelGeometry = new THREE.CylinderGeometry(0.017, 0.017, 0.4, 12);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0.02, 0.75);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
    
    // Integrated scope
    const scopeGeometry = new THREE.BoxGeometry(0.03, 0.04, 0.2);
    const scopeMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.position.set(0, 0.08, 0.3);
    weaponGroup.add(scope);
    
    // Magazine (transparent style)
    const magGeometry = new THREE.BoxGeometry(0.04, 0.16, 0.18);
    const magMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x444444,
        transparent: true,
        opacity: 0.7
    });
    const magazine = new THREE.Mesh(magGeometry, magMaterial);
    magazine.position.set(0, -0.14, 0.15);
    magazine.userData.isMagazine = true;
    weaponGroup.add(magazine);
    
    // Grip (integrated)
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.1, 0.06);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0xFF4500 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.1, 0.4);
    weaponGroup.add(grip);
}

// Create Rocket Launcher model
function createRocketLauncherModel(weaponGroup) {
    // Main tube
    const tubeGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12);
    const tubeMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.rotation.x = Math.PI / 2;
    weaponGroup.add(tube);
    
    // Grip
    const gripGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.06);
    const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.12, 0.2);
    weaponGroup.add(grip);
    
    // Trigger guard
    const triggerGeometry = new THREE.TorusGeometry(0.03, 0.005, 6, 12, Math.PI);
    const triggerMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0, -0.08, 0.15);
    weaponGroup.add(trigger);
    
    // Sight
    const sightGeometry = new THREE.BoxGeometry(0.02, 0.03, 0.08);
    const sightMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const sight = new THREE.Mesh(sightGeometry, sightMaterial);
    sight.position.set(0, 0.1, 0.3);
    weaponGroup.add(sight);
}

// Create default weapon model
function createDefaultWeaponModel(weaponGroup) {
    const bodyGeometry = new THREE.BoxGeometry(0.08, 0.1, 1.0);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    weaponGroup.add(body);
    
    const barrelGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8);
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.position.set(0, 0, 0.65);
    barrel.rotation.x = Math.PI / 2;
    weaponGroup.add(barrel);
}

// Play reload animation
function playReloadAnimation() {
    if (!weaponObject) return;
    
    // Find the magazine in the weapon model
    let magazine = null;
    weaponObject.traverse((child) => {
        if (child.userData && child.userData.isMagazine) {
            magazine = child;
        }
    });
    
    if (!magazine) return;
    
    // Store original position
    const originalPosition = magazine.position.clone();
    const originalRotation = magazine.rotation.clone();
    
    // Animation phases
    let animationPhase = 0; // 0: drop mag, 1: pause, 2: insert new mag
    let animationTime = 0;
    const totalAnimationTime = 2000; // 2 seconds
    
    const animateReload = () => {
        animationTime += 16; // ~60fps
        const progress = animationTime / totalAnimationTime;
        
        if (progress < 0.3) {
            // Phase 1: Drop magazine (first 30% of animation)
            const dropProgress = progress / 0.3;
            magazine.position.y = originalPosition.y - dropProgress * 0.3;
            magazine.rotation.x = originalRotation.x + dropProgress * 0.5;
            magazine.material.opacity = 1 - dropProgress * 0.5;
        } else if (progress < 0.7) {
            // Phase 2: Magazine is "out" (30-70% of animation)
            magazine.position.y = originalPosition.y - 0.3;
            magazine.rotation.x = originalRotation.x + 0.5;
            magazine.material.opacity = 0.5;
        } else {
            // Phase 3: Insert new magazine (last 30% of animation)
            const insertProgress = (progress - 0.7) / 0.3;
            magazine.position.y = originalPosition.y - 0.3 + insertProgress * 0.3;
            magazine.rotation.x = originalRotation.x + 0.5 - insertProgress * 0.5;
            magazine.material.opacity = 0.5 + insertProgress * 0.5;
        }
        
        // Add weapon bobbing during reload
        const bobAmount = Math.sin(progress * Math.PI * 4) * 0.02;
        weaponObject.position.y = -0.3 + bobAmount;
        weaponObject.rotation.z = Math.sin(progress * Math.PI * 2) * 0.1;
        
        if (progress < 1 && gameState.player.isReloading) {
            requestAnimationFrame(animateReload);
        } else {
            // Reset weapon position
            weaponObject.position.y = -0.3;
            weaponObject.rotation.z = 0;
            
            // Reset magazine
            magazine.position.copy(originalPosition);
            magazine.rotation.copy(originalRotation);
            magazine.material.opacity = 1;
        }
    };
    
    animateReload();
}

// Create proper start panel
function createStartPanel() {
    // Remove existing title and start button
    const existingTitle = document.querySelector('h1');
    if (existingTitle) existingTitle.remove();
    
    if (startButton) startButton.style.display = 'none';
    
    // Create start panel overlay
    const startPanel = document.createElement('div');
    startPanel.id = 'start-panel';
    startPanel.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, rgba(0,0,0,0.9), rgba(20,20,50,0.9));
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 1000;
        font-family: 'Arial', sans-serif;
        color: white;
    `;
    
    // Game title
    const title = document.createElement('h1');
    title.textContent = 'HUNTER GAMES 3D';
    title.style.cssText = `
        font-size: 4rem;
        margin-bottom: 1rem;
        text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
        background: linear-gradient(45deg, #ff6b6b, #feca57, #48dbfb, #ff9ff3);
        background-size: 400% 400%;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        animation: gradientShift 3s ease-in-out infinite;
    `;
    
    // Add gradient animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes gradientShift {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        .start-button {
            padding: 15px 30px;
            margin: 10px;
            background: linear-gradient(45deg, #e74c3c, #c0392b);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 1.2rem;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
            letter-spacing: 1px;
            box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
        }
        .start-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
            background: linear-gradient(45deg, #c0392b, #a93226);
        }
        .skip-button {
            background: linear-gradient(45deg, #f39c12, #e67e22) !important;
            box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4) !important;
        }
        .skip-button:hover {
            background: linear-gradient(45deg, #e67e22, #d35400) !important;
            box-shadow: 0 6px 20px rgba(243, 156, 18, 0.6) !important;
        }
    `;
    document.head.appendChild(style);
    
    // Subtitle
    const subtitle = document.createElement('p');
    subtitle.textContent = 'Survive. Collect. Dominate.';
    subtitle.style.cssText = `
        font-size: 1.5rem;
        margin-bottom: 3rem;
        opacity: 0.8;
        text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
    `;
    
    // Game description
    const description = document.createElement('div');
    description.innerHTML = `
        <p style="text-align: center; max-width: 600px; line-height: 1.6; margin-bottom: 2rem; opacity: 0.9;">
            Welcome to the ultimate survival arena. Navigate through three deadly stages:
            <br><br>
            <strong>Stage 1:</strong> The Warehouse - Collect weapons and coins before enemies arrive
            <br>
            <strong>Stage 2:</strong> Reds or Blues - Choose your team and fight for dominance
            <br>
            <strong>Stage 3:</strong> The Billionaire Hunter - Face the final boss
        </p>
    `;
    
    // Controls info
    const controls = document.createElement('div');
    controls.innerHTML = `
        <div style="text-align: center; margin-bottom: 2rem; opacity: 0.8; font-size: 0.9rem;">
            <strong>Controls:</strong> WASD - Move | Mouse - Look | 1-5 - Switch Weapons | R - Reload | U - Ready for Stage 2 | Left Click - Shoot
        </div>
    `;
    
    // Button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 15px;
    `;
    
    // Start game button
    const newStartButton = document.createElement('button');
    newStartButton.textContent = 'Start Stage 1: The Warehouse';
    newStartButton.className = 'start-button';
    newStartButton.addEventListener('click', () => {
        startPanel.remove();
        startGame();
    });
    
    // Skip to stage 2 button
    const skipButton = document.createElement('button');
    skipButton.textContent = 'Ready for Stage 2? Skip to Checkpoint';
    skipButton.className = 'start-button skip-button';
    skipButton.addEventListener('click', () => {
        startPanel.remove();
        skipToStage2();
    });
    
    // Add elements to panel
    startPanel.appendChild(title);
    startPanel.appendChild(subtitle);
    startPanel.appendChild(description);
    startPanel.appendChild(controls);
    
    buttonContainer.appendChild(newStartButton);
    buttonContainer.appendChild(skipButton);
    startPanel.appendChild(buttonContainer);
    
    document.body.appendChild(startPanel);
}

// Skip to stage 2 checkpoint
function skipToStage2() {
    // Give player starting equipment for stage 2
    gameState.player.health = 100;
    gameState.player.coins = 100; // Give more coins for the skip option
    gameState.player.kills = 5; // Give some "experience"
    
    // Give player a basic weapon with full ammo
    const basicWeapon = {
        type: 'weapon',
        weapon: WEAPONS.AK74,
        ammo: WEAPONS.AK74.capacity // Start with full magazine
    };
    gameState.player.inventory.push(basicWeapon);
    gameState.player.weapon = basicWeapon;
    gameState.player.currentWeaponIndex = 0;
    
    // Add some extra ammo
    gameState.player.inventory.push({
        type: 'ammo',
        ammoType: 'rifle',
        count: 90
    });
    
    // Add a backup weapon
    const backupWeapon = {
        type: 'weapon',
        weapon: WEAPONS.QBB95,
        ammo: WEAPONS.QBB95.capacity
    };
    gameState.player.inventory.push(backupWeapon);
    
    // Add some rockets for variety
    gameState.player.inventory.push({
        type: 'ammo',
        ammoType: 'rocket',
        count: 3
    });
    
    // Set up for stage 2 checkpoint
    gameState.currentStage = STAGES.WAREHOUSE; // Stay at warehouse stage but show checkpoint
    gameState.stageCompleted = true;
    gameState.gameStarted = true;
    
    // Create basic warehouse terrain for the checkpoint
    setupStage(STAGES.WAREHOUSE);
    
    updateWeaponVisual();
    updateUI();
    showCheckpoint();
}

// Create muzzle flash effect
function createMuzzleFlash() {
    if (!weaponObject) return;
    
    // Remove existing muzzle flash
    if (muzzleFlash) {
        weaponObject.remove(muzzleFlash);
    }
    
    // Create new muzzle flash
    const flashGeometry = new THREE.SphereGeometry(0.1, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    
    muzzleFlash = new THREE.Mesh(flashGeometry, flashMaterial);
    muzzleFlash.position.set(0, 0, 0.7);
    weaponObject.add(muzzleFlash);
    
    // Animate muzzle flash
    let flashTime = 0;
    const flashDuration = 0.1;
    
    const animateFlash = () => {
        flashTime += 0.016; // ~60fps
        
        if (flashTime < flashDuration) {
            muzzleFlash.material.opacity = 0.8 * (1 - flashTime / flashDuration);
            muzzleFlash.scale.setScalar(1 + flashTime * 5);
            requestAnimationFrame(animateFlash);
        } else {
            weaponObject.remove(muzzleFlash);
            muzzleFlash = null;
        }
    };
    
    animateFlash();
}

// Create hit effect when enemy is hit
function createHitEffect(position) {
    const hitGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const hitMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,
        transparent: true,
        opacity: 0.8
    });
    
    const hitEffect = new THREE.Mesh(hitGeometry, hitMaterial);
    hitEffect.position.copy(position);
    effectsGroup.add(hitEffect);
    
    // Animate hit effect
    let effectTime = 0;
    const effectDuration = 0.3;
    
    const animateHit = () => {
        effectTime += 0.016;
        
        if (effectTime < effectDuration) {
            hitEffect.material.opacity = 0.8 * (1 - effectTime / effectDuration);
            hitEffect.scale.setScalar(1 + effectTime * 3);
            requestAnimationFrame(animateHit);
        } else {
            effectsGroup.remove(hitEffect);
        }
    };
    
    animateHit();
}

// Create bullet impact effect on walls
function createBulletImpact(position, normal) {
    // Create spark particles
    for (let i = 0; i < 5; i++) {
        const sparkGeometry = new THREE.SphereGeometry(0.02, 4, 4);
        const sparkMaterial = new THREE.MeshBasicMaterial({ 
            color: 0xffaa00,
            transparent: true,
            opacity: 1.0
        });
        
        const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
        spark.position.copy(position);
        
        // Random direction influenced by surface normal
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        );
        direction.add(normal.multiplyScalar(2));
        direction.normalize();
        
        spark.userData = {
            velocity: direction.multiplyScalar(0.1 + Math.random() * 0.1),
            life: 0.5 + Math.random() * 0.3
        };
        
        effectsGroup.add(spark);
        
        // Animate spark
        const animateSpark = () => {
            spark.userData.life -= 0.016;
            
            if (spark.userData.life > 0) {
                spark.position.add(spark.userData.velocity);
                spark.userData.velocity.y -= 0.005; // Gravity
                spark.material.opacity = spark.userData.life / 0.8;
                requestAnimationFrame(animateSpark);
            } else {
                effectsGroup.remove(spark);
            }
        };
        
        animateSpark();
    }
}

// Create enemy attack effect
function createEnemyAttackEffect(position) {
    const attackGeometry = new THREE.SphereGeometry(0.3, 8, 8);
    const attackMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff4444,
        transparent: true,
        opacity: 0.9
    });
    
    const attackEffect = new THREE.Mesh(attackGeometry, attackMaterial);
    attackEffect.position.copy(position);
    attackEffect.position.y += 0.5;
    effectsGroup.add(attackEffect);
    
    // Animate attack effect
    let effectTime = 0;
    const effectDuration = 0.4;
    
    const animateAttack = () => {
        effectTime += 0.016;
        
        if (effectTime < effectDuration) {
            attackEffect.material.opacity = 0.9 * (1 - effectTime / effectDuration);
            attackEffect.scale.setScalar(1 + effectTime * 4);
            attackEffect.rotation.y += 0.2;
            requestAnimationFrame(animateAttack);
        } else {
            effectsGroup.remove(attackEffect);
        }
    };
    
    animateAttack();
}

// Create enemy shooting effect
function createEnemyShootEffect(fromPosition, toPosition) {
    // Create bullet trail
    const trailGeometry = new THREE.CylinderGeometry(0.02, 0.02, fromPosition.distanceTo(toPosition), 8);
    const trailMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.8
    });
    
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    
    // Position and orient the trail
    const midPoint = new THREE.Vector3().addVectors(fromPosition, toPosition).multiplyScalar(0.5);
    trail.position.copy(midPoint);
    trail.lookAt(toPosition);
    trail.rotation.x += Math.PI / 2;
    
    effectsGroup.add(trail);
    
    // Create muzzle flash at enemy position
    const flashGeometry = new THREE.SphereGeometry(0.15, 8, 8);
    const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffaa00,
        transparent: true,
        opacity: 1.0
    });
    
    const flash = new THREE.Mesh(flashGeometry, flashMaterial);
    flash.position.copy(fromPosition);
    flash.position.y += 0.5;
    effectsGroup.add(flash);
    
    // Animate effects
    let effectTime = 0;
    const effectDuration = 0.15;
    
    const animateShoot = () => {
        effectTime += 0.016;
        
        if (effectTime < effectDuration) {
            const opacity = 1 - effectTime / effectDuration;
            trail.material.opacity = opacity * 0.8;
            flash.material.opacity = opacity;
            flash.scale.setScalar(1 + effectTime * 5);
            requestAnimationFrame(animateShoot);
        } else {
            effectsGroup.remove(trail);
            effectsGroup.remove(flash);
        }
    };
    
    animateShoot();
}

// Add controls display
function addControlsDisplay() {
    const controlsDiv = document.createElement('div');
    controlsDiv.id = 'controls-info';
    controlsDiv.innerHTML = `
        <div style="position: absolute; top: 10px; left: 10px; color: white; font-family: Arial; font-size: 14px; text-shadow: 2px 2px 4px rgba(0,0,0,0.8); opacity: 0.8;">
            <div>WASD - Move</div>
            <div>Mouse - Look</div>
            <div>1-5 - Switch Weapons</div>
            <div>R - Reload</div>
            <div>U - Ready for Stage 2</div>
            <div>Left Click - Shoot</div>
        </div>
    `;
    document.getElementById('game-container').appendChild(controlsDiv);
}

// Add timer UI element
function createTimerUI() {
    const timerElement = document.createElement('div');
    timerElement.id = 'timer';
    timerElement.style.position = 'absolute';
    timerElement.style.top = '10px';
    timerElement.style.right = '10px';
    timerElement.style.color = 'white';
    timerElement.style.fontSize = '24px';
    timerElement.style.fontFamily = 'Arial, sans-serif';
    timerElement.style.textShadow = '2px 2px 4px rgba(0,0,0,0.5)';
    document.getElementById('game-container').appendChild(timerElement);
}

// Update timer display
function updateTimer() {
    const timerElement = document.getElementById('timer');
    if (!timerElement) return;
    
    const minutes = Math.floor(gameState.timer / 60);
    const seconds = Math.floor(gameState.timer % 60);
    timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    if (gameState.timer <= 30) {
        timerElement.style.color = 'red';
    }
}

// Timer countdown
function startTimer() {
    console.log('Starting timer...'); // Debug log
    gameState.timerActive = true;
    gameState.timer = 180; // 3 minutes in seconds
    gameState.enemySpawnTimer = 60; // Spawn enemies after 60 seconds
    gameState.enemySpawned = false;
    updateTimer();
}

function stopTimer() {
    console.log('Stopping timer...'); // Debug log
    gameState.timerActive = false;
}

// Add door interaction
function interactWithDoor(doorIndex) {
    const door = gameState.doors[doorIndex];
    if (!door) return;

    const isOpen = gameState.doorStates[doorIndex];
    const targetRotation = isOpen ? 0 : Math.PI / 2;
    const targetPosition = isOpen ? 
        door.position.clone() : 
        door.position.clone().add(new THREE.Vector3(0, 0, isOpen ? -2 : 2));

    // Animate door
    const duration = 1000; // 1 second
    const startTime = Date.now();
    const startRotation = door.rotation.y;
    const startPosition = door.position.clone();

    function animateDoor() {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        door.rotation.y = startRotation + (targetRotation - startRotation) * progress;
        door.position.lerpVectors(startPosition, targetPosition, progress);

        if (progress < 1) {
            requestAnimationFrame(animateDoor);
        } else {
            gameState.doorStates[doorIndex] = !isOpen;
        }
    }

    animateDoor();
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    initGame();
    createTimerUI();
    animate();
}); 