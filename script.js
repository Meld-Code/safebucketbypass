/* ============================================================
   CIPHANON SAFE BROWSER — SCRIPT.JS
   Includes:
   - Welcome screen
   - Compact / Moving Blocks modes
   - Physics and collisions
   - Search and embedded browser
   - Control Center
   - Information panel
   - Date and time
   - Random ads
   - Custom cursor and hover videos
   - Settings
   - Interactive spotlight tutorial with orange target border
   - Firebase analytics compatibility
============================================================ */

"use strict";

/* ============================================================
   ANALYTICS
============================================================ */

function trackEvent(eventName, eventData = {}) {
    if (
        window.firebaseAnalytics &&
        typeof window.firebaseLogEvent === "function"
    ) {
        window.firebaseLogEvent(
            window.firebaseAnalytics,
            eventName,
            eventData
        );
    }
}

/* ============================================================
   SAFE STORAGE
============================================================ */

function readStorage(key, fallback = null) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
    } catch (_) {
        return fallback;
    }
}

function writeStorage(key, value) {
    try {
        localStorage.setItem(key, String(value));
        return true;
    } catch (_) {
        return false;
    }
}

/* ============================================================
   WELCOME SCREEN
============================================================ */

const welcome = document.getElementById("welcome");
const enterSafeBucket = document.getElementById("enterSafeBucket");
const dontShowWelcome = document.getElementById("dontShowWelcome");

if (welcome && enterSafeBucket) {
    if (readStorage("safeBucketWelcomeHidden") === "true") {
        welcome.classList.add("hidden");

        if (dontShowWelcome) {
            dontShowWelcome.checked = true;
        }
    }

    enterSafeBucket.addEventListener("click", () => {
        if (dontShowWelcome?.checked) {
            writeStorage("safeBucketWelcomeHidden", true);
        }

        welcome.classList.add("hidden");

        if (typeof window.showTutorialPrompt === "function") {
            window.setTimeout(() => {
                window.showTutorialPrompt();
            }, 250);
        }
    });
}

/* ============================================================
   MAIN ELEMENTS
============================================================ */

const world = document.getElementById("world");
const blocks = [...document.querySelectorAll(".block")];

const browser = document.getElementById("browser");
const browserFrame = document.getElementById("browserFrame");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const closeBrowser = document.getElementById("closeBrowser");
const browserBackButton = document.getElementById("backButton");
const browserForwardButton = document.getElementById("forwardButton");

const movingBlocksToggle =
    document.getElementById("movingBlocksToggle");

/* ============================================================
   MOVING BLOCKS MODE

   OFF:
   - Small shortcut icons at the top of the page
   - No physics movement

   ON:
   - Original block dimensions
   - Floating, dragging, rotation, bouncing and collisions
============================================================ */

const MOVING_BLOCKS_KEY = "safeBucketMovingBlocks";

let movingBlocksEnabled =
    readStorage(MOVING_BLOCKS_KEY, "false") === "true";

const objects = [];

const originalBlockStyles = new Map();

blocks.forEach(el => {
    originalBlockStyles.set(el, {
        position: el.style.position,
        left: el.style.left,
        top: el.style.top,
        transform: el.style.transform,
        width: el.style.width,
        height: el.style.height,
        margin: el.style.margin,
        flex: el.style.flex,
        pointerEvents: el.style.pointerEvents,
        touchAction: el.style.touchAction
    });
});

/* ============================================================
   PHYSICS SETTINGS
============================================================ */

const PHYSICS = {
    gravity: 0,
    air: 0.9994,
    angularAir: 0.9992,
    restitution: 0.82,
    friction: 0.018,
    collisionIterations: 6,
    positionPercent: 0.92,
    minimumSpeed: 0.035,
    maxSpeed: 1.8,
    maxAngular: 0.018,
    cornerSteps: 8
};

function random(min, max) {
    return Math.random() * (max - min) + min;
}

function sub(a, b) {
    return {
        x: a.x - b.x,
        y: a.y - b.y
    };
}

function mul(v, n) {
    return {
        x: v.x * n,
        y: v.y * n
    };
}

function dot(a, b) {
    return a.x * b.x + a.y * b.y;
}

function vectorLength(v) {
    return Math.hypot(v.x, v.y);
}

function normalize(v) {
    const length = vectorLength(v);

    if (length < 0.000001) {
        return { x: 1, y: 0 };
    }

    return {
        x: v.x / length,
        y: v.y / length
    };
}

function rotatePoint(point, angle) {
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);

    return {
        x: point.x * cosine - point.y * sine,
        y: point.x * sine + point.y * cosine
    };
}

function getSize(el) {
    return {
        width: el.offsetWidth || 80,
        height: el.offsetHeight || 60
    };
}

function getRadius(el) {
    const style = getComputedStyle(el);
    const radius = parseFloat(style.borderTopLeftRadius) || 0;
    const size = getSize(el);

    return Math.min(radius, size.width / 2, size.height / 2);
}

/* ============================================================
   CREATE PHYSICS OBJECTS
============================================================ */

function createObject(el, index) {
    const size = getSize(el);

    const obj = {
        el,
        x: random(40, Math.max(40, innerWidth - size.width - 40)),
        y: random(40, Math.max(40, innerHeight - size.height - 40)),
        width: size.width,
        height: size.height,
        radius: getRadius(el),

        vx: random(-0.65, 0.65),
        vy: random(-0.65, 0.65),

        angle: random(-Math.PI, Math.PI),
        angularVelocity: random(-0.006, 0.006),

        mass: 1,
        dragging: false,
        pointerId: null,
        previousX: 0,
        previousY: 0,
        moved: false,
        hovered: false,
        uprightTarget: 0
    };

    const positions = [
        [0.16, 0.24],
        [0.68, 0.25],
        [0.20, 0.67],
        [0.68, 0.68]
    ];

    if (positions[index]) {
        obj.x = innerWidth * positions[index][0];
        obj.y = innerHeight * positions[index][1];
    }

    obj.previousX = obj.x;
    obj.previousY = obj.y;

    return obj;
}

blocks.forEach((el, index) => {
    const obj = createObject(el, index);

    objects.push(obj);
    setupDragging(obj);
});

/* ============================================================
   COMPACT MODE LAYOUT

   Blocks stay in a compact row at the top of the page.
============================================================ */

function applyCompactLayout() {
    if (world) {
        world.classList.remove("moving-blocks-enabled");
        world.classList.add("moving-blocks-compact");

        // Pin the shortcut row to the top of the viewport.
        world.style.position = "fixed";
        world.style.inset = "auto";
        world.style.left = "50%";
        world.style.top = "12px";
        world.style.width = "calc(100% - 24px)";
        world.style.height = "auto";
        world.style.minHeight = "0";
        world.style.display = "flex";
        world.style.flexWrap = "wrap";
        world.style.justifyContent = "center";
        world.style.alignItems = "center";
        world.style.gap = "8px";
        world.style.zIndex = "10";
        world.style.pointerEvents = "auto";
        world.style.transform = "translateX(-50%)";
        world.style.boxSizing = "border-box";
    }

    for (const obj of objects) {
        const el = obj.el;

        el.classList.remove("moving-block-active");
        el.classList.add("moving-block-compact");

        el.style.position = "relative";
        el.style.left = "auto";
        el.style.top = "auto";
        el.style.transform = "none";
        el.style.margin = "0";
        el.style.flex = "0 0 auto";
        el.style.pointerEvents = "auto";
        el.style.touchAction = "manipulation";

        // Explicitly shrink blocks while compact mode is enabled.
        el.style.width = "64px";
        el.style.height = "64px";
        el.style.minWidth = "0";
        el.style.minHeight = "0";

        el.classList.remove("dragging");

        obj.dragging = false;
        obj.pointerId = null;
        obj.vx = 0;
        obj.vy = 0;
        obj.angularVelocity = 0;
    }
}

/* ============================================================
   MOVING MODE LAYOUT

   Restore the original CSS dimensions and enable physics.
============================================================ */

function applyMovingLayout() {
    if (world) {
        world.classList.remove("moving-blocks-compact");
        world.classList.add("moving-blocks-enabled");

        world.style.position = "fixed";
        world.style.inset = "0";
        world.style.left = "0";
        world.style.top = "0";
        world.style.width = "100vw";
        world.style.height = "100vh";
        world.style.minHeight = "0";
        world.style.display = "block";
        world.style.flexWrap = "nowrap";
        world.style.justifyContent = "initial";
        world.style.alignItems = "initial";
        world.style.gap = "0";
        world.style.zIndex = "10";
        world.style.pointerEvents = "none";
        world.style.transform = "none";
        world.style.boxSizing = "border-box";
    }

    for (const obj of objects) {
        const el = obj.el;
        const original = originalBlockStyles.get(el);

        el.classList.remove("moving-block-compact");
        el.classList.add("moving-block-active");

        el.style.position = "absolute";
        el.style.left = "0";
        el.style.top = "0";
        el.style.margin = "0";
        el.style.flex = "none";
        el.style.pointerEvents = "auto";
        el.style.touchAction = "none";

        // Remove compact sizing before restoring the original size.
        el.style.minWidth = "";
        el.style.minHeight = "";

        if (original) {
            el.style.width = original.width;
            el.style.height = original.height;
        }

        obj.width = el.offsetWidth || obj.width;
        obj.height = el.offsetHeight || obj.height;
        obj.radius = getRadius(el);

        obj.x = Math.max(
            obj.width / 2,
            Math.min(innerWidth - obj.width / 2, obj.x)
        );

        obj.y = Math.max(
            obj.height / 2,
            Math.min(innerHeight - obj.height / 2, obj.y)
        );

        obj.vx = random(-0.65, 0.65);
        obj.vy = random(-0.65, 0.65);
        obj.angularVelocity = random(-0.006, 0.006);
        obj.previousX = obj.x;
        obj.previousY = obj.y;
    }
}

/* ============================================================
   SWITCH MOVING BLOCKS MODE
============================================================ */

function setMovingBlocksEnabled(enabled, save = true) {
    movingBlocksEnabled = Boolean(enabled);

    if (save) {
        writeStorage(MOVING_BLOCKS_KEY, movingBlocksEnabled);
    }

    if (movingBlocksToggle) {
        movingBlocksToggle.checked = movingBlocksEnabled;
    }

    document.body.classList.toggle(
        "moving-blocks-enabled",
        movingBlocksEnabled
    );

    document.body.classList.toggle(
        "moving-blocks-compact",
        !movingBlocksEnabled
    );

    if (movingBlocksEnabled) {
        applyMovingLayout();
    } else {
        applyCompactLayout();
    }

    for (const obj of objects) {
        render(obj);
    }

    // Keep the tutorial highlight aligned if the layout changes.
    if (tutorialIsOpen()) {
        renderTutorialStep();
    }

    trackEvent("moving_blocks_mode", {
        enabled: movingBlocksEnabled
    });
}

if (movingBlocksToggle) {
    movingBlocksToggle.addEventListener("change", () => {
        setMovingBlocksEnabled(movingBlocksToggle.checked);
    });
}

/* ============================================================
   ROUNDED RECTANGLE POLYGON
============================================================ */

function roundedPolygon(obj) {
    const w = obj.width;
    const h = obj.height;
    const r = Math.min(obj.radius, w / 2, h / 2);

    if (r <= 0) {
        const corners = [
            { x: -w / 2, y: -h / 2 },
            { x: w / 2, y: -h / 2 },
            { x: w / 2, y: h / 2 },
            { x: -w / 2, y: h / 2 }
        ];

        return corners.map(point => {
            const rotated = rotatePoint(point, obj.angle);

            return {
                x: obj.x + rotated.x,
                y: obj.y + rotated.y
            };
        });
    }

    const points = [];

    const corners = [
        { cx: w / 2 - r, cy: -h / 2 + r, start: -Math.PI / 2 },
        { cx: w / 2 - r, cy: h / 2 - r, start: 0 },
        { cx: -w / 2 + r, cy: h / 2 - r, start: Math.PI / 2 },
        { cx: -w / 2 + r, cy: -h / 2 + r, start: Math.PI }
    ];

    for (const corner of corners) {
        for (let i = 0; i <= PHYSICS.cornerSteps; i++) {
            const angle =
                corner.start + (i / PHYSICS.cornerSteps) * Math.PI / 2;

            const local = {
                x: corner.cx + Math.cos(angle) * r,
                y: corner.cy + Math.sin(angle) * r
            };

            const rotated = rotatePoint(local, obj.angle);

            points.push({
                x: obj.x + rotated.x,
                y: obj.y + rotated.y
            });
        }
    }

    return points;
}

/* ============================================================
   SAT COLLISION DETECTION
============================================================ */

function getAxes(polygon) {
    const axes = [];

    for (let i = 0; i < polygon.length; i++) {
        const a = polygon[i];
        const b = polygon[(i + 1) % polygon.length];

        const edge = {
            x: b.x - a.x,
            y: b.y - a.y
        };

        axes.push(normalize({
            x: -edge.y,
            y: edge.x
        }));
    }

    return axes;
}

function project(polygon, axis) {
    let min = Infinity;
    let max = -Infinity;

    for (const point of polygon) {
        const value = dot(point, axis);

        min = Math.min(min, value);
        max = Math.max(max, value);
    }

    return { min, max };
}

function polygonCollision(polyA, polyB) {
    const axes = [...getAxes(polyA), ...getAxes(polyB)];

    let smallestOverlap = Infinity;
    let smallestAxis = null;

    for (const axis of axes) {
        const a = project(polyA, axis);
        const b = project(polyB, axis);

        const overlap =
            Math.min(a.max, b.max) - Math.max(a.min, b.min);

        if (overlap <= 0) {
            return null;
        }

        if (overlap < smallestOverlap) {
            smallestOverlap = overlap;
            smallestAxis = axis;
        }
    }

    return {
        depth: smallestOverlap,
        axis: smallestAxis
    };
}

/* ============================================================
   COLLISION RESOLUTION
============================================================ */

function resolveCollision(a, b, collision) {
    if (!collision) return;

    let normal = collision.axis;

    const direction = sub(
        { x: b.x, y: b.y },
        { x: a.x, y: a.y }
    );

    if (dot(direction, normal) < 0) {
        normal = mul(normal, -1);
    }

    const correctionDepth =
        Math.max(collision.depth - 0.01, 0) *
        PHYSICS.positionPercent;

    const totalMass = a.mass + b.mass;

    if (correctionDepth > 0) {
        if (!a.dragging) {
            const share = b.mass / totalMass;

            a.x -= normal.x * correctionDepth * share;
            a.y -= normal.y * correctionDepth * share;
        }

        if (!b.dragging) {
            const share = a.mass / totalMass;

            b.x += normal.x * correctionDepth * share;
            b.y += normal.y * correctionDepth * share;
        }
    }

    const relativeVelocity = {
        x: b.vx - a.vx,
        y: b.vy - a.vy
    };

    const velocityAlongNormal = dot(relativeVelocity, normal);

    if (velocityAlongNormal > 0) return;

    const impulseMagnitude =
        -(1 + PHYSICS.restitution) *
        velocityAlongNormal /
        (1 / a.mass + 1 / b.mass);

    const impulse = mul(normal, impulseMagnitude);

    if (!a.dragging) {
        a.vx -= impulse.x / a.mass;
        a.vy -= impulse.y / a.mass;
    }

    if (!b.dragging) {
        b.vx += impulse.x / b.mass;
        b.vy += impulse.y / b.mass;
    }

    const tangent = {
        x: -normal.y,
        y: normal.x
    };

    const tangentVelocity = dot(relativeVelocity, tangent);
    const frictionImpulse = tangentVelocity * PHYSICS.friction;

    if (!a.dragging) {
        a.vx += tangent.x * frictionImpulse;
        a.vy += tangent.y * frictionImpulse;
    }

    if (!b.dragging) {
        b.vx -= tangent.x * frictionImpulse;
        b.vy -= tangent.y * frictionImpulse;
    }
}

function solveAllCollisions() {
    if (!movingBlocksEnabled) return;

    for (
        let iteration = 0;
        iteration < PHYSICS.collisionIterations;
        iteration++
    ) {
        let foundCollision = false;

        for (let i = 0; i < objects.length; i++) {
            const a = objects[i];

            for (let j = i + 1; j < objects.length; j++) {
                const b = objects[j];

                if (a.dragging || b.dragging) continue;

                const collision = polygonCollision(
                    roundedPolygon(a),
                    roundedPolygon(b)
                );

                if (collision) {
                    foundCollision = true;
                    resolveCollision(a, b, collision);
                }
            }
        }

        if (!foundCollision) break;
    }
}

/* ============================================================
   SCREEN EDGES
============================================================ */

function keepInside(obj) {
    if (!movingBlocksEnabled || obj.dragging) return;

    const polygon = roundedPolygon(obj);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const point of polygon) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
    }

    if (minX < 0) {
        obj.x -= minX;
        if (obj.vx < 0) obj.vx = -obj.vx * PHYSICS.restitution;
    }

    if (maxX > innerWidth) {
        obj.x -= maxX - innerWidth;
        if (obj.vx > 0) obj.vx = -obj.vx * PHYSICS.restitution;
    }

    if (minY < 0) {
        obj.y -= minY;
        if (obj.vy < 0) obj.vy = -obj.vy * PHYSICS.restitution;
    }

    if (maxY > innerHeight) {
        obj.y -= maxY - innerHeight;
        if (obj.vy > 0) obj.vy = -obj.vy * PHYSICS.restitution;
    }
}

/* ============================================================
   SPEED AND FLOATING
============================================================ */

function limitVelocity(obj) {
    const speed = Math.hypot(obj.vx, obj.vy);

    if (speed > PHYSICS.maxSpeed) {
        const scale = PHYSICS.maxSpeed / speed;

        obj.vx *= scale;
        obj.vy *= scale;
    }

    if (Math.abs(obj.angularVelocity) > PHYSICS.maxAngular) {
        obj.angularVelocity =
            Math.sign(obj.angularVelocity) * PHYSICS.maxAngular;
    }
}

function keepFloating(obj, time) {
    if (!movingBlocksEnabled || obj.dragging) return;

    obj.vx +=
        Math.sin(time * 0.00025 + obj.x * 0.002) * 0.0015;

    obj.vy +=
        Math.cos(time * 0.00021 + obj.y * 0.002) * 0.0015;

    const speed = Math.hypot(obj.vx, obj.vy);

    if (speed < PHYSICS.minimumSpeed) {
        const angle = Math.atan2(obj.y, obj.x) + Math.PI / 2;

        obj.vx += Math.cos(angle) * PHYSICS.minimumSpeed;
        obj.vy += Math.sin(angle) * PHYSICS.minimumSpeed;
    }
}

/* ============================================================
   DRAGGING AND SHORTCUT CLICKS
============================================================ */

function setupDragging(obj) {
    const el = obj.el;

    el.addEventListener("mouseenter", () => {
        obj.hovered = true;
    });

    el.addEventListener("mouseleave", () => {
        obj.hovered = false;
    });

    let downX = 0;
    let downY = 0;
    let startX = 0;
    let startY = 0;

    el.addEventListener("pointerdown", event => {
        if (!movingBlocksEnabled) return;

        if (event.button !== undefined && event.button !== 0) {
            return;
        }

        event.preventDefault();

        obj.dragging = true;
        obj.pointerId = event.pointerId;

        try {
            el.setPointerCapture(event.pointerId);
        } catch (_) {}

        downX = event.clientX;
        downY = event.clientY;

        startX = obj.x;
        startY = obj.y;

        obj.previousX = obj.x;
        obj.previousY = obj.y;

        obj.vx = 0;
        obj.vy = 0;
        obj.moved = false;

        el.classList.add("dragging");
    });

    el.addEventListener("pointermove", event => {
        if (
            !movingBlocksEnabled ||
            !obj.dragging ||
            event.pointerId !== obj.pointerId
        ) {
            return;
        }

        const dx = event.clientX - downX;
        const dy = event.clientY - downY;

        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
            obj.moved = true;
        }

        obj.x = startX + dx;
        obj.y = startY + dy;

        keepInside(obj);
    });

    function release(event) {
        if (
            !obj.dragging ||
            event.pointerId !== obj.pointerId
        ) {
            return;
        }

        obj.dragging = false;

        try {
            el.releasePointerCapture(event.pointerId);
        } catch (_) {}

        el.classList.remove("dragging");

        obj.vx = Math.max(
            -PHYSICS.maxSpeed,
            Math.min(PHYSICS.maxSpeed, (obj.x - obj.previousX) * 0.22)
        );

        obj.vy = Math.max(
            -PHYSICS.maxSpeed,
            Math.min(PHYSICS.maxSpeed, (obj.y - obj.previousY) * 0.22)
        );

        if (!obj.moved) {
            openShortcut(obj.el);
        }

        obj.pointerId = null;
    }

    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);

    // In compact mode, clicking a shortcut opens its website.
    el.addEventListener("click", event => {
        if (movingBlocksEnabled) return;

        if (event.target.closest("button, a")) return;

        openShortcut(el);
    });
}

function openShortcut(el) {
    const url = el.dataset.url;

    if (!url) return;

    trackEvent("shortcut_click", {
        shortcut_name: el.dataset.name || el.textContent.trim()
    });

    openBrowser(url);
}

/* ============================================================
   RENDER AND HOVER ROTATION
============================================================ */

function normalizeAngle(angle) {
    return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function updateHoverRotation(obj, dt) {
    if (!obj.hovered || obj.dragging) return;

    const difference = normalizeAngle(
        obj.uprightTarget - obj.angle
    );

    obj.angle += difference * 0.02 * dt;
    obj.angularVelocity *= 0.72;

    if (Math.abs(difference) < 0.01) {
        obj.angle = obj.uprightTarget;
        obj.angularVelocity = 0;
    }
}

function render(obj) {
    if (!movingBlocksEnabled) {
        obj.el.style.transform = "none";
        return;
    }

    const scale = obj.hovered && !obj.dragging ? 1.06 : 1;

    obj.el.style.transform =
        `translate3d(${obj.x - obj.width / 2}px, ` +
        `${obj.y - obj.height / 2}px, 0) ` +
        `rotate(${obj.angle}rad) scale(${scale})`;
}

/* ============================================================
   MAIN PHYSICS LOOP
============================================================ */

let lastTime = performance.now();

function physicsLoop(time) {
    let dt = (time - lastTime) / 16.6667;

    lastTime = time;
    dt = Math.min(dt, 2);

    if (movingBlocksEnabled) {
        for (const obj of objects) {
            if (obj.dragging) {
                render(obj);
                continue;
            }

            obj.previousX = obj.x;
            obj.previousY = obj.y;

            obj.vy += PHYSICS.gravity * dt;

            obj.vx *= Math.pow(PHYSICS.air, dt);
            obj.vy *= Math.pow(PHYSICS.air, dt);

            obj.angularVelocity *=
                Math.pow(PHYSICS.angularAir, dt);

            obj.x += obj.vx * dt;
            obj.y += obj.vy * dt;

            obj.angle += obj.angularVelocity * dt;

            updateHoverRotation(obj, dt);
            keepFloating(obj, time);
            limitVelocity(obj);
            keepInside(obj);
        }

        solveAllCollisions();

        for (const obj of objects) {
            keepInside(obj);
            render(obj);
        }
    }

    requestAnimationFrame(physicsLoop);
}

requestAnimationFrame(physicsLoop);

/* ============================================================
   RESIZE
============================================================ */

window.addEventListener("resize", () => {
    for (const obj of objects) {
        obj.width = obj.el.offsetWidth || obj.width;
        obj.height = obj.el.offsetHeight || obj.height;
        obj.radius = getRadius(obj.el);

        keepInside(obj);
    }

    solveAllCollisions();

    for (const obj of objects) {
        render(obj);
    }

    if (tutorialIsOpen()) {
        renderTutorialStep();
    }
});

/* ============================================================
   URL / SEARCH
============================================================ */

function getDestination(value) {
    value = value.trim();

    if (!value) return null;

    const localPages = [
        "games.html",
        "movies.html",
        "roblox.html",
        "index.html"
    ];

    if (localPages.includes(value.toLowerCase())) {
        return value;
    }

    if (/^https?:\/\//i.test(value)) {
        return value;
    }

    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(value)) {
        return "https://" + value;
    }

    return "https://www.google.com/search?q=" +
        encodeURIComponent(value);
}

/* ============================================================
   OPEN / CLOSE BROWSER
============================================================ */

function openBrowser(url) {
    if (!url || !browser || !browserFrame) return;

    trackEvent("open_site", {
        site_name: url
    });

    browserFrame.src = url;
    browser.classList.add("open");
}

function closeBrowserWindow() {
    if (!browser || !browserFrame) return;

    browser.classList.remove("open");
    browserFrame.src = "about:blank";
}

if (closeBrowser) {
    closeBrowser.addEventListener("click", closeBrowserWindow);
}

/* ============================================================
   SEARCH FORM
============================================================ */

if (searchForm && searchInput) {
    searchForm.addEventListener("submit", event => {
        event.preventDefault();

        const destination = getDestination(searchInput.value);

        if (destination) {
            trackEvent("search_used");
            openBrowser(destination);
            searchInput.blur();
        }
    });

    searchInput.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            searchForm.requestSubmit();
        }
    });
}

/* ============================================================
   BROWSER ESCAPE AND NAVIGATION
============================================================ */

document.addEventListener("keydown", event => {
    if (
        event.key === "Escape" &&
        browser?.classList.contains("open")
    ) {
        closeBrowserWindow();
    }
});

if (browserBackButton && browserFrame) {
    browserBackButton.addEventListener("click", () => {
        try {
            browserFrame.contentWindow.history.back();
        } catch (_) {}
    });
}

if (browserForwardButton && browserFrame) {
    browserForwardButton.addEventListener("click", () => {
        try {
            browserFrame.contentWindow.history.forward();
        } catch (_) {}
    });
}

/* ============================================================
   INFO BUTTON
============================================================ */

const infoButton = document.getElementById("infoButton");
const infoOverlay = document.getElementById("infoOverlay");
const infoClose = document.getElementById("infoClose");

if (infoButton && infoOverlay) {
    infoButton.addEventListener("click", () => {
        infoOverlay.classList.add("open");
    });
}

if (infoClose && infoOverlay) {
    infoClose.addEventListener("click", () => {
        infoOverlay.classList.remove("open");
    });
}

if (infoOverlay) {
    infoOverlay.addEventListener("click", event => {
        if (event.target === infoOverlay) {
            infoOverlay.classList.remove("open");
        }
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && infoOverlay) {
        infoOverlay.classList.remove("open");
    }
});

/* ============================================================
   DATE AND TIME
============================================================ */

const currentTime = document.getElementById("currentTime");
const currentDate = document.getElementById("currentDate");
const dateTime = document.getElementById("dateTime");

function updateDateTime() {
    const now = new Date();

    if (currentTime) {
        currentTime.textContent = now.toLocaleTimeString(undefined, {
            hour: "numeric",
            minute: "2-digit",
            second: "2-digit"
        });
    }

    if (currentDate) {
        currentDate.textContent = now.toLocaleDateString(undefined, {
            month: "long",
            day: "numeric",
            year: "numeric"
        });
    }

    if (dateTime) {
        dateTime.textContent = now.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }
}

updateDateTime();
window.setInterval(updateDateTime, 1000);

/* ============================================================
   RANDOM AD SYSTEM
============================================================ */

const randomAd = document.getElementById("randomAd");
const closeRandomAd = document.getElementById("closeRandomAd");
const randomAdButton = document.getElementById("randomAdButton");
const randomAdTitle = document.getElementById("randomAdTitle");
const randomAdText = document.getElementById("randomAdText");

const adList = [
    {
        title: "Try Safe Bucket",
        text: "Quick access to games, tools, websites, and more.",
        button: "Open Safe Bucket",
        url: "index.html"
    },
    {
        title: "Play Some Games",
        text: "Find games and other fun websites in one place.",
        button: "Open Games",
        url: "games.html"
    },
    {
        title: "Visit CiphAnon Studios",
        text: "Explore more projects created by CiphAnon Studios.",
        button: "Visit Studio",
        url: "https://ciphanonstudios.github.io/CiphAnonStudios-v12"
    },
    {
        title: "Check Out Minecraft",
        text: "Open the Minecraft section and start playing.",
        button: "Open Minecraft",
        url: "https://safebucketbypass.github.io/MC/"
    },
    {
        title: "Explore Anime",
        text: "Find anime content through Safe Bucket.",
        button: "Open Anime",
        url: "https://mkissa.to/"
    }
];

let currentAd = null;
let adTimer = null;
let adHideTimer = null;
let lastAdIndex = -1;

function getRandomAd() {
    let index;

    do {
        index = Math.floor(Math.random() * adList.length);
    } while (adList.length > 1 && index === lastAdIndex);

    lastAdIndex = index;
    return adList[index];
}

function getRandomDelay() {
    return Math.floor(random(20000, 60000));
}

function hideRandomAd() {
    randomAd?.classList.remove("show");

    if (adHideTimer !== null) {
        clearTimeout(adHideTimer);
        adHideTimer = null;
    }
}

function showRandomAd() {
    if (
        !randomAd ||
        !randomAdTitle ||
        !randomAdText ||
        !randomAdButton
    ) {
        return;
    }

    currentAd = getRandomAd();

    randomAdTitle.textContent = currentAd.title;
    randomAdText.textContent = currentAd.text;
    randomAdButton.textContent = currentAd.button;

    randomAd.classList.add("show");

    if (adHideTimer !== null) {
        clearTimeout(adHideTimer);
    }

    adHideTimer = window.setTimeout(hideRandomAd, 12000);
}

function scheduleRandomAd() {
    if (adTimer !== null) {
        clearTimeout(adTimer);
    }

    adTimer = window.setTimeout(() => {
        showRandomAd();
        scheduleRandomAd();
    }, getRandomDelay());
}

if (closeRandomAd) {
    closeRandomAd.addEventListener("click", () => {
        hideRandomAd();
        scheduleRandomAd();
    });
}

if (randomAdButton) {
    randomAdButton.addEventListener("click", () => {
        if (currentAd?.url) {
            openBrowser(currentAd.url);
        }

        hideRandomAd();
        scheduleRandomAd();
    });
}

scheduleRandomAd();

/* ============================================================
   CIPHANON CONTROL CENTER
============================================================ */

(() => {
    const panel = document.getElementById("controlPanel");
    const toggle = document.getElementById("controlPanelToggle");
    const closeButton = document.getElementById("controlPanelClose");
    const statusText = document.getElementById("controlStatusText");
    const statusDot = document.getElementById("controlStatusDot");

    const intervalInput = document.getElementById("autoClickInterval");
    const intervalLabel = document.getElementById("controlIntervalLabel");
    const startButton = document.getElementById("autoClickStart");
    const clickCountLabel = document.getElementById("controlClickCount");
    const singleClickButton = document.getElementById("singleClickButton");
    const resetButton = document.getElementById("resetClickCount");
    const releaseButton = document.getElementById("releaseAllKeys");

    const frame = document.getElementById("browserFrame");

    if (!panel || !toggle || !closeButton || !intervalInput || !startButton || !frame) {
        return;
    }

    let clickTimer = null;
    let clickCount = 0;
    let running = false;

    const heldKeys = new Set();

    function setStatus(message, active = false) {
        if (statusText) statusText.textContent = message;
        statusDot?.classList.toggle("active", active);
    }

    function getTargetWindow() {
        try {
            const target = frame.contentWindow;
            void target.document;
            return target;
        } catch (_) {
            return null;
        }
    }

    function sendKey(key, type) {
        const target = getTargetWindow();

        if (!target) {
            setStatus("Page blocks keyboard access");
            return false;
        }

        try {
            const keyMap = {
                " ": { key: " ", code: "Space", keyCode: 32 },
                Shift: { key: "Shift", code: "ShiftLeft", keyCode: 16 },
                w: { key: "w", code: "KeyW", keyCode: 87 },
                a: { key: "a", code: "KeyA", keyCode: 65 },
                s: { key: "s", code: "KeyS", keyCode: 83 },
                d: { key: "d", code: "KeyD", keyCode: 68 }
            };

            const info = keyMap[key] || {
                key,
                code: "",
                keyCode: 0
            };

            const event = new target.KeyboardEvent(type, {
                key: info.key,
                code: info.code,
                bubbles: true,
                cancelable: true
            });

            target.document.dispatchEvent(event);
            target.document.activeElement?.dispatchEvent(event);

            setStatus("Input sent; game support varies", true);
            return true;
        } catch (_) {
            setStatus("Could not send keyboard input");
            return false;
        }
    }

    function pressKey(key) {
        if (heldKeys.has(key)) return;

        heldKeys.add(key);
        sendKey(key, "keydown");
    }

    function releaseKey(key) {
        if (!heldKeys.has(key)) return;

        heldKeys.delete(key);
        sendKey(key, "keyup");
    }

    function releaseAllKeys() {
        for (const key of [...heldKeys]) {
            releaseKey(key);
        }

        heldKeys.clear();
        setStatus("Keys released");
    }

    function stopAutoClicker() {
        if (clickTimer !== null) {
            clearInterval(clickTimer);
            clickTimer = null;
        }

        running = false;
        startButton.textContent = "Start";
        startButton.classList.remove("running");
    }

    function setPanelOpen(open) {
        panel.classList.toggle("visible", open);
        toggle.setAttribute("aria-expanded", String(open));

        if (!open) {
            stopAutoClicker();
            releaseAllKeys();
        }
    }

    function sendClick() {
        const target = getTargetWindow();

        if (!target) {
            stopAutoClicker();
            setStatus("Page blocks click access");
            return false;
        }

        try {
            const doc = target.document;
            const element = doc.activeElement;

            if (!element || element === doc.body || element === doc.documentElement) {
                setStatus("Tap inside the page first");
                return false;
            }

            for (const type of ["mousedown", "mouseup", "click"]) {
                element.dispatchEvent(new target.MouseEvent(type, {
                    bubbles: true,
                    cancelable: true,
                    view: target,
                    button: 0
                }));
            }

            clickCount++;

            if (clickCountLabel) {
                clickCountLabel.textContent = String(clickCount);
            }

            setStatus("Click event sent", true);
            return true;
        } catch (_) {
            setStatus("Could not send click");
            return false;
        }
    }

    function startAutoClicker() {
        const interval = Number(intervalInput.value);

        if (!Number.isFinite(interval) || interval < 50 || interval > 10000) {
            setStatus("Choose 50–10000 milliseconds");
            intervalInput.value = "500";

            if (intervalLabel) intervalLabel.textContent = "500 ms";
            return;
        }

        stopAutoClicker();

        if (intervalLabel) intervalLabel.textContent = `${interval} ms`;

        running = true;
        startButton.textContent = "Stop";
        startButton.classList.add("running");
        setStatus("Auto clicker running", true);

        clickTimer = window.setInterval(() => {
            if (!sendClick()) stopAutoClicker();
        }, interval);
    }

    toggle.addEventListener("click", () => {
        setPanelOpen(!panel.classList.contains("visible"));
    });

    closeButton.addEventListener("click", () => {
        setPanelOpen(false);
    });

    panel.querySelectorAll("[data-key]").forEach(button => {
        const key = button.dataset.key;

        button.addEventListener("pointerdown", event => {
            event.preventDefault();
            pressKey(key);
        });

        const release = () => releaseKey(key);

        button.addEventListener("pointerup", release);
        button.addEventListener("pointercancel", release);
        button.addEventListener("lostpointercapture", release);
    });

    releaseButton?.addEventListener("click", releaseAllKeys);

    startButton.addEventListener("click", () => {
        if (running) {
            stopAutoClicker();
            setStatus("Auto clicker stopped");
        } else {
            startAutoClicker();
        }
    });

    intervalInput.addEventListener("input", () => {
        const value = Number(intervalInput.value);

        if (intervalLabel) {
            intervalLabel.textContent =
                Number.isFinite(value) && value > 0 ? `${value} ms` : "—";
        }

        if (running) {
            stopAutoClicker();
            setStatus("Interval changed; press Start again");
        }
    });

    singleClickButton?.addEventListener("click", sendClick);

    resetButton?.addEventListener("click", () => {
        clickCount = 0;

        if (clickCountLabel) clickCountLabel.textContent = "0";

        setStatus("Click counter reset");
    });

    document.addEventListener("keydown", event => {
        if (
            event.key.toLowerCase() === "control" &&
            !event.repeat
        ) {
            const tag = event.target?.tagName;

            if (tag === "INPUT" || tag === "TEXTAREA") return;

            event.preventDefault();
            setPanelOpen(!panel.classList.contains("visible"));
        }

        if (event.key === "Escape" && panel.classList.contains("visible")) {
            event.stopPropagation();
            setPanelOpen(false);
        }
    }, true);

    window.addEventListener("blur", releaseAllKeys);

    frame.addEventListener("load", () => {
        stopAutoClicker();
        releaseAllKeys();
        setStatus("Page loaded; controls ready");
    });

    window.addEventListener("pagehide", () => {
        stopAutoClicker();
        releaseAllKeys();
    });

    setStatus("Controls ready");
})();

/* ============================================================
   CUSTOM CURSOR
============================================================ */

const cursor = document.getElementById("custom-cursor");

if (cursor) {
    document.addEventListener("mousemove", event => {
        cursor.style.left = `${event.clientX}px`;
        cursor.style.top = `${event.clientY}px`;
    });
}

/* ============================================================
   BLOCK AND FULL-PAGE HOVER VIDEOS
============================================================ */

const backgroundVideo = document.getElementById("backgroundVideo");
let backgroundVideoTimer = null;

blocks.forEach(block => {
    const blockVideo = block.querySelector(".blockVideo");
    const backgroundSource = block.dataset.backgroundVideo;

    block.addEventListener("mouseenter", () => {
        clearTimeout(backgroundVideoTimer);

        if (blockVideo) {
            blockVideo.currentTime = 0;
            blockVideo.play().catch(() => {});
        }

        if (!backgroundSource || !backgroundVideo) return;

        const fullSource = new URL(backgroundSource, document.baseURI).href;

        if (backgroundVideo.src !== fullSource) {
            backgroundVideo.src = backgroundSource;
            backgroundVideo.load();
        }

        backgroundVideo.currentTime = 0;
        backgroundVideo.classList.add("active");
        backgroundVideo.play().catch(() => {});
    });

    block.addEventListener("mouseleave", () => {
        if (blockVideo) {
            blockVideo.pause();
            blockVideo.currentTime = 0;
        }

        if (!backgroundSource || !backgroundVideo) return;

        backgroundVideoTimer = window.setTimeout(() => {
            backgroundVideo.pause();
            backgroundVideo.classList.remove("active");
        }, 150);
    });
});

/* ============================================================
   SETTINGS PANEL
============================================================ */

(() => {
    const settingsBtn = document.getElementById("settingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");

    if (!settingsBtn || !settingsPanel) return;

    function openSettings() {
        settingsPanel.hidden = false;
        settingsPanel.style.display = "block";
        settingsPanel.setAttribute("aria-hidden", "false");
        settingsBtn.setAttribute("aria-expanded", "true");
    }

    function hideSettings() {
        settingsPanel.hidden = true;
        settingsPanel.style.display = "none";
        settingsPanel.setAttribute("aria-hidden", "true");
        settingsBtn.setAttribute("aria-expanded", "false");
    }

    hideSettings();

    settingsBtn.addEventListener("click", event => {
        event.preventDefault();

        if (settingsPanel.hidden) {
            openSettings();
        } else {
            hideSettings();
        }
    });

    closeSettings?.addEventListener("click", event => {
        event.preventDefault();
        hideSettings();
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !settingsPanel.hidden) {
            hideSettings();
        }
    });

    window.openSafeBucketSettings = openSettings;
    window.closeSafeBucketSettings = hideSettings;
})();

/* ============================================================
   INTERACTIVE TUTORIAL WITH SPOTLIGHT AND ORANGE BORDER
============================================================ */

const tutorialState = {
    isOpen: false,
    currentStep: 0,
    promptDismissedThisSession: false
};

function tutorialIsOpen() {
    return tutorialState.isOpen;
}

let renderTutorialStep = function () {};

(() => {
    const prompt = document.getElementById("tutorialPrompt");
    const tutorial = document.getElementById("tutorialOverlay");

    const spotlightLayer =
        document.getElementById("tutorialSpotlightLayer");

    const spotlight =
        document.getElementById("tutorialSpotlight");

    const dontShowAgain =
        document.getElementById("dontShowTutorialAgain");

    const startButton = document.getElementById("startTutorial");
    const skipPromptButton = document.getElementById("skipTutorialPrompt");
    const closeButton = document.getElementById("closeTutorial");
    const backButton = document.getElementById("tutorialBack");
    const nextButton = document.getElementById("tutorialNext");
    const skipButton = document.getElementById("tutorialSkip");

    const stepCount = document.getElementById("tutorialStepCount");
    const title = document.getElementById("tutorialTitle");
    const description = document.getElementById("tutorialDescription");
    const progressBar = document.getElementById("tutorialProgressBar");
    const progress = document.getElementById("tutorialProgress");

    const replayButton =
        document.getElementById("replayTutorialButton");

    const settingsPanel =
        document.getElementById("settingsPanel");

    if (
        !prompt ||
        !tutorial ||
        !startButton ||
        !skipPromptButton ||
        !closeButton ||
        !backButton ||
        !nextButton ||
        !skipButton ||
        !stepCount ||
        !title ||
        !description ||
        !progressBar
    ) {
        console.warn("Tutorial elements are missing from index.html.");
        return;
    }

    const steps = [
        {
            title: "Welcome to Safe Bucket!",
            description:
                "This quick tour shows you the main features. The orange border highlights the feature being explained.",
            target: "#searchForm",
            fallback: "#world"
        },
        {
            title: "Your Shortcuts",
            description:
                "These compact icons are website shortcuts. Tap one to open its website. Enable Moving Blocks in Settings to restore the larger floating blocks.",
            target: "#world",
            fallback: ".block"
        },
        {
            title: "Search the Web",
            description:
                "Enter a topic or website address here, then press Go or Enter to open it in the browser panel.",
            target: "#searchForm",
            fallback: "#searchInput"
        },
        {
            title: "Open Websites",
            description:
                "Tap a shortcut or search for a website to open it. Some websites block embedded browsers and may not load inside Safe Bucket.",
            target: "#browser",
            fallback: "#searchForm"
        },
        {
            title: "Browser Controls",
            description:
                "When the browser is open, use Back and Forward to navigate when supported, or X to close it. The CTRL button opens the Control Center.",
            target: "#browser",
            fallback: "#controlPanelToggle"
        },
        {
            title: "Moving Blocks",
            description:
                "Open Settings and turn on Moving Blocks to enable the larger physics blocks. Turn it off to return to the compact shortcuts at the top of the page.",
            target: "#settingsBtn",
            fallback: "#movingBlocksToggle"
        },
        {
            title: "Settings and Information",
            description:
                "Use the gear button to open Settings and replay this tutorial. The information button opens the Safe Bucket information panel.",
            target: "#settingsBtn",
            fallback: "#infoButton"
        },
        {
            title: "You're Ready!",
            description:
                "That's the tour! Explore Safe Bucket and return to Settings whenever you want to replay it.",
            target: "#settingsBtn",
            fallback: "#world"
        }
    ];

    let tutorialCard = null;
    let highlightedTarget = null;
    let savedTargetOutline = null;
    let savedTargetOutlineOffset = null;

    function findTutorialCard() {
        return (
            tutorial.querySelector(
                ".tutorial-card, .tutorial-panel, .tutorial-content, " +
                ".tutorial-dialog, [data-tutorial-card]"
            ) ||
            tutorial.firstElementChild ||
            tutorial
        );
    }

    tutorialCard = findTutorialCard();

    function readPreference(key) {
        return readStorage(key) === "true";
    }

    function savePreference(key, value) {
        writeStorage(key, value);
    }

    function findTarget(step) {
        let target = null;

        if (step.target) {
            target = document.querySelector(step.target);
        }

        if (
            (!target || target.getClientRects().length === 0) &&
            step.fallback
        ) {
            target = document.querySelector(step.fallback);
        }

        if (target && target.getClientRects().length === 0) {
            target = null;
        }

        return target;
    }

    function clearTargetHighlight() {
        if (!highlightedTarget) return;

        highlightedTarget.style.outline =
            savedTargetOutline ?? "";

        highlightedTarget.style.outlineOffset =
            savedTargetOutlineOffset ?? "";

        highlightedTarget.classList.remove("tutorial-highlight-target");

        highlightedTarget = null;
        savedTargetOutline = null;
        savedTargetOutlineOffset = null;
    }

    function highlightTarget(target) {
        if (target === highlightedTarget) return;

        clearTargetHighlight();

        if (!target) return;

        highlightedTarget = target;

        savedTargetOutline = target.style.outline;
        savedTargetOutlineOffset = target.style.outlineOffset;

        // Add a real outline to the target, not just the spotlight layer.
        target.classList.add("tutorial-highlight-target");
        target.style.outline = "3px solid #ff6a00";
        target.style.outlineOffset = "4px";
    }

    function showTutorialPrompt() {
        if (
            readPreference("safeBucketTutorialDisabled") ||
            tutorialState.promptDismissedThisSession
        ) {
            return;
        }

        if (welcome && !welcome.classList.contains("hidden")) {
            return;
        }

        if (tutorialState.isOpen) return;

        prompt.hidden = false;
        prompt.setAttribute("aria-hidden", "false");
    }

    function closePrompt() {
        prompt.hidden = true;
        prompt.setAttribute("aria-hidden", "true");
        tutorialState.promptDismissedThisSession = true;
    }

    function positionSpotlight(target) {
        if (!spotlight || !spotlightLayer) return;

        if (!target) {
            spotlightLayer.style.display = "none";
            spotlight.style.display = "none";
            return;
        }

        const rect = target.getBoundingClientRect();
        const padding = 7;

        const left = Math.max(0, rect.left - padding);
        const top = Math.max(0, rect.top - padding);

        const width = Math.min(
            window.innerWidth - left,
            rect.width + padding * 2
        );

        const height = Math.min(
            window.innerHeight - top,
            rect.height + padding * 2
        );

        spotlightLayer.style.display = "block";
        spotlightLayer.style.position = "fixed";
        spotlightLayer.style.inset = "0";
        spotlightLayer.style.pointerEvents = "none";
        spotlightLayer.style.zIndex = "9997";

        spotlight.style.display = "block";
        spotlight.style.position = "fixed";
        spotlight.style.left = `${left}px`;
        spotlight.style.top = `${top}px`;
        spotlight.style.width = `${Math.max(0, width)}px`;
        spotlight.style.height = `${Math.max(0, height)}px`;
        spotlight.style.boxSizing = "border-box";
        spotlight.style.border = "3px solid #ff6a00";
        spotlight.style.borderRadius = "12px";
        spotlight.style.boxShadow =
            "0 0 0 9999px rgba(0, 0, 0, 0.62), " +
            "0 0 22px rgba(255, 106, 0, 0.8)";
        spotlight.style.background = "transparent";
        spotlight.style.pointerEvents = "none";
        spotlight.style.zIndex = "9998";
        spotlight.style.transition =
            "left 180ms ease, top 180ms ease, width 180ms ease, height 180ms ease";
    }

    function positionTutorialCard(target) {
        if (!tutorialCard) return;

        const margin = 16;
        const gap = 18;

        tutorialCard.style.position = "fixed";
        tutorialCard.style.transform = "none";
        tutorialCard.style.margin = "0";
        tutorialCard.style.maxWidth = "min(420px, calc(100vw - 32px))";
        tutorialCard.style.maxHeight = "calc(100vh - 32px)";
        tutorialCard.style.overflowY = "auto";
        tutorialCard.style.zIndex = "10000";
        tutorialCard.style.pointerEvents = "auto";

        // Place the card temporarily so its size can be measured.
        tutorialCard.style.left = `${margin}px`;
        tutorialCard.style.top = `${margin}px`;
        tutorialCard.style.right = "auto";
        tutorialCard.style.bottom = "auto";

        const cardRect = tutorialCard.getBoundingClientRect();

        const cardWidth = Math.min(
            cardRect.width || 360,
            window.innerWidth - margin * 2
        );

        const cardHeight = Math.min(
            cardRect.height || 260,
            window.innerHeight - margin * 2
        );

        let left = (window.innerWidth - cardWidth) / 2;
        let top = (window.innerHeight - cardHeight) / 2;

        if (target) {
            const rect = target.getBoundingClientRect();

            const positions = [
                {
                    left: rect.right + gap,
                    top: rect.top
                },
                {
                    left: rect.left - cardWidth - gap,
                    top: rect.top
                },
                {
                    left: rect.left,
                    top: rect.bottom + gap
                },
                {
                    left: rect.left,
                    top: rect.top - cardHeight - gap
                }
            ];

            const fits = positions.find(position =>
                position.left >= margin &&
                position.top >= margin &&
                position.left + cardWidth <= window.innerWidth - margin &&
                position.top + cardHeight <= window.innerHeight - margin
            );

            if (fits) {
                left = fits.left;
                top = fits.top;
            } else {
                const targetIsUpper =
                    rect.top + rect.height / 2 < window.innerHeight / 2;

                const targetIsLeft =
                    rect.left + rect.width / 2 < window.innerWidth / 2;

                if (targetIsUpper) {
                    top = window.innerHeight - cardHeight - margin;
                } else {
                    top = margin;
                }

                if (targetIsLeft) {
                    left = window.innerWidth - cardWidth - margin;
                } else {
                    left = margin;
                }
            }
        }

        left = Math.max(
            margin,
            Math.min(window.innerWidth - cardWidth - margin, left)
        );

        top = Math.max(
            margin,
            Math.min(window.innerHeight - cardHeight - margin, top)
        );

        tutorialCard.style.left = `${left}px`;
        tutorialCard.style.top = `${top}px`;
        tutorialCard.style.right = "auto";
        tutorialCard.style.bottom = "auto";
    }

    renderTutorialStep = function () {
        if (!tutorialState.isOpen) return;

        const step = steps[tutorialState.currentStep];

        if (!step) return;

        title.textContent = step.title;
        description.textContent = step.description;

        stepCount.textContent =
            `Step ${tutorialState.currentStep + 1} of ${steps.length}`;

        const percentage =
            ((tutorialState.currentStep + 1) / steps.length) * 100;

        progressBar.style.width = `${percentage}%`;

        progressBar.setAttribute(
            "aria-valuenow",
            String(tutorialState.currentStep + 1)
        );

        progressBar.setAttribute("aria-valuemin", "1");
        progressBar.setAttribute("aria-valuemax", String(steps.length));

        if (progress) {
            progress.setAttribute("role", "progressbar");
            progress.setAttribute(
                "aria-valuenow",
                String(tutorialState.currentStep + 1)
            );
            progress.setAttribute("aria-valuemin", "1");
            progress.setAttribute("aria-valuemax", String(steps.length));
            progress.setAttribute("aria-label", "Tutorial progress");
        }

        backButton.disabled = tutorialState.currentStep === 0;

        const isLastStep =
            tutorialState.currentStep === steps.length - 1;

        nextButton.textContent = isLastStep ? "Finish" : "Next";

        nextButton.setAttribute(
            "aria-label",
            isLastStep ? "Finish tutorial" : "Next tutorial step"
        );

        const target = findTarget(step);

        highlightTarget(target);
        positionSpotlight(target);
        positionTutorialCard(target);
    };

    function startTutorial() {
        closePrompt();

        if (settingsPanel) {
            settingsPanel.hidden = true;
            settingsPanel.style.display = "none";
            settingsPanel.setAttribute("aria-hidden", "true");
        }

        if (welcome && !welcome.classList.contains("hidden")) {
            welcome.classList.add("hidden");
        }

        tutorialState.currentStep = 0;
        tutorialState.isOpen = true;

        tutorial.hidden = false;
        tutorial.setAttribute("aria-hidden", "false");

        tutorial.style.position = "fixed";
        tutorial.style.inset = "0";
        tutorial.style.background = "transparent";
        tutorial.style.pointerEvents = "none";
        tutorial.style.zIndex = "9999";

        renderTutorialStep();

        closeButton.focus();
    }

    function endTutorial() {
        tutorialState.isOpen = false;

        clearTargetHighlight();

        tutorial.hidden = true;
        tutorial.setAttribute("aria-hidden", "true");

        if (spotlightLayer) {
            spotlightLayer.style.display = "none";
        }

        if (spotlight) {
            spotlight.style.display = "none";
        }

        if (tutorialCard) {
            tutorialCard.style.position = "";
            tutorialCard.style.left = "";
            tutorialCard.style.top = "";
            tutorialCard.style.right = "";
            tutorialCard.style.bottom = "";
            tutorialCard.style.transform = "";
            tutorialCard.style.maxWidth = "";
            tutorialCard.style.maxHeight = "";
            tutorialCard.style.overflowY = "";
            tutorialCard.style.zIndex = "";
            tutorialCard.style.pointerEvents = "";
        }

        tutorial.style.background = "";
        tutorial.style.pointerEvents = "";
        tutorial.style.zIndex = "";
    }

    function saveDontShowPreference() {
        if (dontShowAgain?.checked) {
            savePreference("safeBucketTutorialDisabled", true);
        }
    }

    startButton.addEventListener("click", () => {
        saveDontShowPreference();
        startTutorial();
    });

    skipPromptButton.addEventListener("click", () => {
        saveDontShowPreference();
        closePrompt();
    });

    closeButton.addEventListener("click", endTutorial);
    skipButton.addEventListener("click", endTutorial);

    backButton.addEventListener("click", () => {
        if (tutorialState.currentStep > 0) {
            tutorialState.currentStep--;
            renderTutorialStep();
        }
    });

    nextButton.addEventListener("click", () => {
        if (tutorialState.currentStep < steps.length - 1) {
            tutorialState.currentStep++;
            renderTutorialStep();
        } else {
            endTutorial();
        }
    });

    replayButton?.addEventListener("click", startTutorial);

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        if (tutorialState.isOpen) {
            endTutorial();
        } else if (!prompt.hidden) {
            closePrompt();
        }
    });

    window.showTutorialPrompt = showTutorialPrompt;
    window.watchSafeBucketTutorial = startTutorial;
    window.startSafeBucketTutorial = startTutorial;
    window.closeSafeBucketTutorial = endTutorial;

    if (!welcome || welcome.classList.contains("hidden")) {
        showTutorialPrompt();
    }
})();

/* ============================================================
   INITIALIZE MOVING BLOCKS MODE
============================================================ */

setMovingBlocksEnabled(movingBlocksEnabled, false);

/* ============================================================
   INITIAL RENDER
============================================================ */

for (const obj of objects) {
    render(obj);
}
