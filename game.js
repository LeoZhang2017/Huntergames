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
        weapon: null
    },
    enemies: [],
    items: [],
    gameStarted: false,
    stageCompleted: false,
    gameOver: false,
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
let playerObject, weaponObject;
let skybox;
let terrainGroup, itemsGroup, enemiesGroup;
let raycaster, mouse;
let clock;

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
    
    // Start button event listener
    startButton.addEventListener('click', startGame);
    
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
    
    scene.add(terrainGroup);
    scene.add(itemsGroup);
    scene.add(enemiesGroup);
    
    // Create player object (invisible, just for collision)
    playerObject = new THREE.Group();
    scene.add(playerObject);
    
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
        weapon: null
    };
    gameState.enemies = [];
    gameState.items = [];
    gameState.gameStarted = false;
    gameState.stageCompleted = false;
    gameState.gameOver = false;
    
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
            setupArena();
            break;
        case STAGES.FOREST:
            currentStageElement.textContent = "The Billionaire Hunter";
            setupForest();
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
    // Create weapon placement zones (different sections of the warehouse)
    const weaponZones = [
        { x: -35, z: -35, radius: 10 }, // Top left
        { x: 35, z: -35, radius: 10 },  // Top right
        { x: -35, z: 35, radius: 10 },  // Bottom left
        { x: 35, z: 35, radius: 10 }    // Bottom right
    ];
    
    // Spawn weapons in their respective zones
    const weaponKeys = Object.keys(WEAPONS);
    for (let i = 0; i < weaponKeys.length; i++) {
        const weaponType = weaponKeys[i];
        const weapon = WEAPONS[weaponType];
        
        // Select zone for this weapon
        const zone = weaponZones[i % weaponZones.length];
        
        // Create a weapon model
        const weaponGeometry = new THREE.BoxGeometry(1, 0.2, 0.5);
        const weaponMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const weaponMesh = new THREE.Mesh(weaponGeometry, weaponMaterial);
        
        // Position within zone (random point within circle)
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * zone.radius;
        const x = zone.x + Math.cos(angle) * distance;
        const z = zone.z + Math.sin(angle) * distance;
        
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
        
        // Add highlight effect
        const highlightGeometry = new THREE.SphereGeometry(0.5, 8, 8);
        const highlightMaterial = new THREE.MeshBasicMaterial({
            color: 0xff0000,
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

// Update function to handle floating animations for items
const updateItemAnimations = (delta) => {
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
                    gameState.player.inventory.push({
                        type: 'weapon',
                        weapon: item.weapon,
                        ammo: 0
                    });
                    
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
    
    // Lock pointer for FPS controls
    gameContainer.requestPointerLock();
    
    // Start the timer for warehouse stage
    if (gameState.currentStage === STAGES.WAREHOUSE) {
        startTimer();
    }
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
                gameOver(false); // Game over if time runs out
            }
            updateTimer();
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

        // Calculate new position
        const newPosition = gameState.player.position.clone().add(movement);

        // Check wall collisions
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            newPosition,
            new THREE.Vector3(1, 2, 1)
        );

        let canMove = true;
        for (const wall of gameState.wallColliders) {
            if (playerBox.intersectsBox(wall)) {
                canMove = false;
                break;
            }
        }

        // Update position if no collision
        if (canMove) {
            gameState.player.position.copy(newPosition);
            camera.position.copy(newPosition);
        }
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
            gameState.player.position.x = Math.max(-99, Math.min(99, gameState.player.position.x));
            gameState.player.position.z = Math.max(-49, Math.min(49, gameState.player.position.z));
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
    gameState.enemies.forEach(enemy => {
        // Simple AI: move towards player if far away
        const distanceToPlayer = enemy.position.distanceTo(gameState.player.position);
        
        if (distanceToPlayer > 20) {
            // Move towards player
            const direction = new THREE.Vector3()
                .subVectors(gameState.player.position, enemy.position)
                .normalize();
            
            // Keep on xz plane
            direction.y = 0;
            
            // Apply movement
            enemy.position.add(direction.multiplyScalar(enemy.speed));
            
            // Update mesh position
            enemy.mesh.position.copy(enemy.position);
            
            // Update rotation to face player
            enemy.mesh.lookAt(gameState.player.position);
        } else if (distanceToPlayer > 10) {
            // Close enough to shoot but not too close
            // Shooting logic would be implemented here
            
            // Just face the player
            enemy.mesh.lookAt(gameState.player.position);
        }
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
        setupStage(gameState.currentStage);
        
        // Hide message and remove button
        gameMessageElement.style.display = 'none';
        gameMessageElement.innerHTML = '';
        
        // Lock pointer again
        gameContainer.requestPointerLock();
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
function gameOver(victory) {
    // Exit pointer lock
    if (document.pointerLockElement === gameContainer) {
        document.exitPointerLock();
    }
    
    gameState.gameOver = true;
    
    // Show game over message
    gameMessageElement.textContent = victory ? 
        'Congratulations! You have won the Hunter Games!' : 
        'Game Over! You have been eliminated from the Hunter Games!';
    gameMessageElement.style.display = 'block';
    
    // Create restart button
    const restartButton = document.createElement('button');
    restartButton.textContent = 'Play Again';
    restartButton.style.marginTop = '15px';
    restartButton.style.padding = '10px 20px';
    restartButton.style.pointerEvents = 'auto';
    restartButton.onclick = () => {
        // Reset game
        resetGameState();
        
        // Hide message and remove button
        gameMessageElement.style.display = 'none';
        gameMessageElement.innerHTML = '';
        
        // Start game again
        gameState.gameStarted = true;
        gameContainer.requestPointerLock();
    };
    
    gameMessageElement.appendChild(restartButton);
}

// Update UI elements
function updateUI() {
    healthValueElement.textContent = gameState.player.health;
    coinsValueElement.textContent = gameState.player.coins;
    
    // Update ammo count for currently equipped weapon
    const equippedWeapon = gameState.player.inventory.find(item => item.type === 'weapon');
    if (equippedWeapon) {
        ammoValueElement.textContent = equippedWeapon.ammo;
    } else {
        ammoValueElement.textContent = '0';
    }
    
    // Update inventory display
    inventoryElement.innerHTML = '';
    gameState.player.inventory.forEach(item => {
        const itemElement = document.createElement('div');
        itemElement.className = `inventory-item ${item.type}`;
        
        if (item.type === 'weapon') {
            itemElement.textContent = `${item.weapon.name}: ${item.ammo}`;
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
        
        // Handle shooting
        const equippedWeapon = gameState.player.inventory.find(item => item.type === 'weapon');
        if (equippedWeapon && equippedWeapon.ammo > 0) {
            // Reduce ammo
            equippedWeapon.ammo--;
            
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
                    enemy.health -= equippedWeapon.weapon.damage;
                    
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
            }
            
            // Update UI
            updateUI();
        }
    }
}

function handleMouseUp(e) {
    if (e.button === 0) { // Left mouse button
        mouseDown = false;
    }
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

// Add event listener for spacebar to start the game from the start screen
window.addEventListener('keydown', function(e) {
    // Only trigger if start screen is visible and spacebar is pressed
    const startScreen = document.getElementById('start-screen');
    if (startScreen && startScreen.style.display !== 'none' && (e.code === 'Space' || e.key === ' ')) {
        e.preventDefault();
        startButton.click();
    }
}); 