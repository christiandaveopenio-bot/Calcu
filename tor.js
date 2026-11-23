
/* =================================
   BLOCK CAL
   NORMAL + SCIENTIFIC CALCULATOR
================================= */

const screen = document.form1.textview;
const calc = document.getElementById("calc");

const popup = document.getElementById("popup");
const popupContent = document.getElementById("popupContent");
const popupTitle = document.getElementById("popupTitle");
const popupSub = document.getElementById("popupSub");

const sciButtons = document.getElementById("sciButtons");
const normalMode = document.getElementById("normalMode");
const scientificMode = document.getElementById("scientificMode");
const angleModeButton = document.getElementById("angleMode");

const COLORS = [
    "#ff6b6b", "#ffd84a", "#5ee08a",
    "#4fe3e8", "#5a96ff", "#b77bff", "#ff9f43"
];

const PRAISE = [
    "GOOD!", "GREAT!", "EXCELLENT!",
    "AMAZING!", "AWESOME!", "PERFECT!"
];

const SUBTITLES = [
    "NICE CALCULATION!", "YOU GOT IT!",
    "SUPER MOVE!", "KEEP IT UP!",
    "BRILLIANT!", "WELL DONE!"
];

const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

let currentMode = "normal";
let angleMode = "DEG";
let audioContext;
let popupTimer;


/* =================================
   SOUND EFFECTS
================================= */

function playSound(type = "click") {
    try {
        audioContext ||= new (
            window.AudioContext || window.webkitAudioContext
        )();

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

        const ctx = audioContext;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        oscillator.connect(gain);
        gain.connect(ctx.destination);

        if (type === "click") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(520, now);
            oscillator.frequency.exponentialRampToValueAtTime(280, now + .08);
            gain.gain.setValueAtTime(.08, now);
            gain.gain.exponentialRampToValueAtTime(.001, now + .09);
            oscillator.start(now);
            oscillator.stop(now + .1);
        }

        if (type === "blast") {
            oscillator.type = "triangle";
            oscillator.frequency.setValueAtTime(180, now);
            oscillator.frequency.exponentialRampToValueAtTime(850, now + .16);
            oscillator.frequency.exponentialRampToValueAtTime(220, now + .4);
            gain.gain.setValueAtTime(.16, now);
            gain.gain.exponentialRampToValueAtTime(.001, now + .45);
            oscillator.start(now);
            oscillator.stop(now + .46);
        }

        if (type === "clear") {
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(450, now);
            oscillator.frequency.exponentialRampToValueAtTime(180, now + .12);
            gain.gain.setValueAtTime(.09, now);
            gain.gain.exponentialRampToValueAtTime(.001, now + .13);
            oscillator.start(now);
            oscillator.stop(now + .14);
        }

    } catch (error) {
        console.warn("Sound unavailable:", error);
    }
}


/* =================================
   MODE SWITCHING
================================= */

function switchMode(mode) {

    if (currentMode === mode) return;

    currentMode = mode;

    const scientific = mode === "scientific";

    // RESET DISPLAY
    screen.value = "";

    // RESET ANIMATIONS
    screen.classList.remove("display-blast");
    calc.classList.remove("shake");

    // HIDE OLD NOTIFICATION
    popup.classList.remove("show");
    clearTimeout(popupTimer);

    // SWITCH LAYOUT
    sciButtons.classList.toggle("active", scientific);

    normalMode.classList.toggle("active", !scientific);
    scientificMode.classList.toggle("active", scientific);

    calc.classList.toggle("scientific", scientific);

    playSound("click");
}


/* =================================
   DEG / RAD SWITCH
================================= */

function toggleAngleMode() {

    angleMode = angleMode === "DEG" ? "RAD" : "DEG";

    angleModeButton.textContent = angleMode;

    playSound("click");
}


/* =================================
   INPUT
================================= */

function insert(value) {

    if (screen.value === "Error") {
        screen.value = "";
    }

    screen.value += value;

    playSound("click");
}


function clearScreen() {

    screen.value = "";

    playSound("clear");
}


function backspace() {

    if (screen.value === "Error") {
        screen.value = "";
    } else {
        screen.value = screen.value.slice(0, -1);
    }

    playSound("click");
}


/* =================================
   MATHEMATICAL EXPRESSION PARSER
================================= */

function tokenize(expression) {

    const tokens = [];

    const pattern =
        /\s*(?:(\d+(?:\.\d*)?|\.\d+)(?:[eE]([+-]?\d+))?|([a-zA-Z]+)|([()+\-*/^!%]))/y;

    let position = 0;

    while (position < expression.length) {

        pattern.lastIndex = position;

        const match = pattern.exec(expression);

        if (!match) {
            throw new Error("Invalid character");
        }

        position = pattern.lastIndex;

        if (match[1] !== undefined) {

            const number = match[2] !== undefined
                ? Number(match[1] + "e" + match[2])
                : Number(match[1]);

            if (!Number.isFinite(number)) {
                throw new Error("Invalid number");
            }

            tokens.push({
                type: "number",
                value: number
            });

        } else if (match[3] !== undefined) {

            tokens.push({
                type: "name",
                value: match[3].toLowerCase()
            });

        } else {

            tokens.push({
                type: "operator",
                value: match[4]
            });
        }
    }

    // SUPPORT IMPLICIT MULTIPLICATION

    const expanded = [];

    for (let i = 0; i < tokens.length; i++) {

        const current = tokens[i];
        const previous = expanded[expanded.length - 1];

        if (previous) {

            const previousEndsValue =
                previous.type === "number" ||
                (previous.type === "name" &&
                    ["pi", "e"].includes(previous.value)) ||
                (previous.type === "operator" &&
                    [")", "!", "%"].includes(previous.value));

            const currentStartsValue =
                current.type === "number" ||
                current.type === "name" ||
                (current.type === "operator" &&
                    current.value === "(");

            const isFunctionCall =
                previous.type === "name" &&
                current.type === "operator" &&
                current.value === "(";

            if (
                previousEndsValue &&
                currentStartsValue &&
                !isFunctionCall
            ) {
                expanded.push({
                    type: "operator",
                    value: "*"
                });
            }
        }

        expanded.push(current);
    }

    return expanded;
}


/* =================================
   MATHEMATICAL FUNCTIONS
================================= */

function factorial(number) {

    if (
        number < 0 ||
        !Number.isInteger(number) ||
        number > 170
    ) {
        throw new Error("Invalid factorial");
    }

    let result = 1;

    for (let i = 2; i <= number; i++) {
        result *= i;
    }

    return result;
}


function toRadians(value) {

    return angleMode === "DEG"
        ? value * Math.PI / 180
        : value;
}


function fromRadians(value) {

    return angleMode === "DEG"
        ? value * 180 / Math.PI
        : value;
}


function scientificFunction(name, value) {

    switch (name) {

        case "sin":
            return Math.sin(toRadians(value));

        case "cos":
            return Math.cos(toRadians(value));

        case "tan": {
            const radians = toRadians(value);

            if (Math.abs(Math.cos(radians)) < 1e-14) {
                throw new Error("Undefined tangent");
            }

            return Math.tan(radians);
        }

        case "asin":
            return fromRadians(Math.asin(value));

        case "acos":
            return fromRadians(Math.acos(value));

        case "atan":
            return fromRadians(Math.atan(value));

        case "sqrt":
            return Math.sqrt(value);

        case "cbrt":
            return Math.cbrt(value);

        case "log":
            return Math.log10(value);

        case "ln":
            return Math.log(value);

        case "abs":
            return Math.abs(value);

        default:
            throw new Error("Unknown function");
    }
}


/* =================================
   PARSER
================================= */

function evaluateExpression(expression) {

    const tokens = tokenize(expression);

    let position = 0;

    function peek() {
        return tokens[position];
    }

    function consume() {
        return tokens[position++];
    }

    function match(value) {

        if (peek() && peek().value === value) {
            consume();
            return true;
        }

        return false;
    }


    // ADDITION AND SUBTRACTION

    function parseAddition() {

        let result = parseMultiplication();

        while (peek() && ["+", "-"].includes(peek().value)) {

            const operator = consume().value;
            const right = parseMultiplication();

            result = operator === "+"
                ? result + right
                : result - right;
        }

        return result;
    }


    // MULTIPLICATION, DIVISION AND REMAINDER

    function parseMultiplication() {

        let result = parseUnary();

        while (peek() && ["*", "/", "%"].includes(peek().value)) {

            const operator = consume().value;
            const right = parseUnary();

            if (operator === "*") {
                result *= right;
            }

            if (operator === "/") {

                if (right === 0) {
                    throw new Error("Division by zero");
                }

                result /= right;
            }

            if (operator === "%") {

                if (right === 0) {
                    throw new Error("Division by zero");
                }

                result %= right;
            }
        }

        return result;
    }


    // UNARY SIGNS

    function parseUnary() {

        if (match("+")) {
            return parseUnary();
        }

        if (match("-")) {
            return -parseUnary();
        }

        return parsePower();
    }


    // EXPONENTS

    function parsePower() {

        const base = parsePostfix();

        if (match("^")) {

            const exponent = parseUnary();

            return Math.pow(base, exponent);
        }

        return base;
    }


    // FACTORIAL AND PERCENTAGE

    function parsePostfix() {

        let value = parsePrimary();

        while (peek()) {

            if (match("!")) {
                value = factorial(value);
            }

            else if (match("%")) {
                value /= 100;
            }

            else {
                break;
            }
        }

        return value;
    }


    // NUMBERS, CONSTANTS AND FUNCTIONS

    function parsePrimary() {

        const token = consume();

        if (!token) {
            throw new Error("Incomplete expression");
        }

        if (token.type === "number") {
            return token.value;
        }

        if (token.type === "name") {

            const name = token.value;

            if (name === "pi") return Math.PI;
            if (name === "e") return Math.E;

            const allowedFunctions = [
                "sin", "cos", "tan",
                "asin", "acos", "atan",
                "sqrt", "cbrt",
                "log", "ln", "abs"
            ];

            if (!allowedFunctions.includes(name)) {
                throw new Error("Unknown function");
            }

            if (!match("(")) {
                throw new Error("Missing parenthesis");
            }

            const argument = parseAddition();

            if (!match(")")) {
                throw new Error("Missing closing parenthesis");
            }

            return scientificFunction(name, argument);
        }

        if (token.value === "(") {

            const result = parseAddition();

            if (!match(")")) {
                throw new Error("Missing closing parenthesis");
            }

            return result;
        }

        throw new Error("Invalid expression");
    }


    const result = parseAddition();

    if (position !== tokens.length) {
        throw new Error("Unexpected input");
    }

    if (!Number.isFinite(result)) {
        throw new Error("Invalid result");
    }

    return result;
}


/* =================================
   CALCULATE
================================= */

function calculate(expression) {

    const result = evaluateExpression(expression);

    // AVOID FLOATING POINT NOISE
    const rounded = Number(result.toPrecision(12));

    if (!Number.isFinite(rounded)) {
        throw new Error("Invalid result");
    }

    return String(rounded);
}


/* =================================
   ANIMATION HELPERS
================================= */

function restart(element, className) {

    element.classList.remove(className);

    void element.offsetWidth;

    element.classList.add(className);
}


function randomColor() {

    return COLORS[
        Math.floor(Math.random() * COLORS.length)
    ];
}


/* =================================
   PARTICLE CREATION
================================= */

function createParticle(x, y, dx, dy, size, duration, color) {

    const particle = document.createElement("div");

    particle.className = "particle";

    particle.style.width = size + "px";
    particle.style.height = size + "px";
    particle.style.left = x + "px";
    particle.style.top = y + "px";
    particle.style.background = color;

    document.body.appendChild(particle);

    const rotation = Math.random() * 500 - 250;

    const animation = particle.animate(
        [
            {
                transform: "translate(-50%, -50%) scale(1) rotate(0deg)",
                opacity: 1
            },
            {
                transform: `translate(calc(-50% + ${dx * .65}px), calc(-50% + ${dy * .65}px)) scale(.8) rotate(${rotation * .6}deg)`,
                opacity: 1,
                offset: .65
            },
            {
                transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.1) rotate(${rotation}deg)`,
                opacity: 0
            }
        ],
        {
            duration,
            easing: "cubic-bezier(.16,.75,.3,1)",
            fill: "forwards"
        }
    );

    animation.onfinish = () => particle.remove();
}


/* =================================
   SMALL PARTICLE EXPLOSION
================================= */

function burst(x, y, count = 12, spread = 100) {

    if (reduceMotion) return;

    for (let i = 0; i < count; i++) {

        const angle = Math.random() * Math.PI * 2;
        const distance = spread * (.4 + Math.random());

        const dx = Math.cos(angle) * distance;
        const dy = Math.sin(angle) * distance;

        const size = 6 + Math.random() * 9;
        const duration = 650 + Math.random() * 350;

        createParticle(
            x, y, dx, dy, size, duration, randomColor()
        );
    }
}


/* =================================
   GLOWING SPARKS
================================= */

function createSpark(x, y, dx, dy, size) {

    const spark = document.createElement("div");

    spark.className = "blast-particle";

    spark.style.width = size + "px";
    spark.style.height = size + "px";
    spark.style.left = x + "px";
    spark.style.top = y + "px";

    document.body.appendChild(spark);

    const animation = spark.animate(
        [
            {
                transform: "translate(-50%, -50%) scale(1)",
                opacity: 1
            },
            {
                transform: `translate(calc(-50% + ${dx * .5}px), calc(-50% + ${dy * .5}px)) scale(1.2)`,
                opacity: .9,
                offset: .4
            },
            {
                transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0)`,
                opacity: 0
            }
        ],
        {
            duration: 850,
            easing: "cubic-bezier(.15,.65,.3,1)",
            fill: "forwards"
        }
    );

    animation.onfinish = () => spark.remove();
}


/* =================================
   BIG BLAST
================================= */

function bigExplosion() {

    if (reduceMotion) return;

    const rect = popupContent.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;

    // LOWER NUMBER = HIGHER PARTICLES
    const centerY = rect.bottom + 25;

    burst(centerX, centerY, 38, 190);

    setTimeout(() => {
        burst(centerX - 85, centerY + 15, 12, 105);
    }, 100);

    setTimeout(() => {
        burst(centerX + 85, centerY + 15, 12, 105);
    }, 160);

    for (let i = 0; i < 14; i++) {

        const angle = Math.random() * Math.PI * 2;
        const distance = 80 + Math.random() * 160;

        createSpark(
            centerX,
            centerY,
            Math.cos(angle) * distance,
            Math.sin(angle) * distance,
            3 + Math.random() * 5
        );
    }
}


/* =================================
   NOTIFICATION
================================= */

function showNotification() {

    popupTitle.textContent =
        PRAISE[Math.floor(Math.random() * PRAISE.length)];

    popupSub.textContent =
        SUBTITLES[Math.floor(Math.random() * SUBTITLES.length)];

    popup.classList.remove("show");

    void popup.offsetWidth;

    popup.classList.add("show");

    clearTimeout(popupTimer);

    popupTimer = setTimeout(() => {
        popup.classList.remove("show");
    }, 1700);
}


/* =================================
   FINAL RESULT EFFECT
================================= */

function blockBlast() {

    playSound("blast");

    restart(screen, "display-blast");
    restart(calc, "shake");

    showNotification();

    requestAnimationFrame(() => {
        bigExplosion();
    });
}


/* =================================
   EQUAL BUTTON
================================= */

function equal() {

    const expression = screen.value.trim();

    if (!expression) return;

    // DON'T CELEBRATE A SINGLE ORDINARY NUMBER
    const isCalculation =
        /[+\-*/^!%()]|[a-zA-Z]/.test(expression);

    if (!isCalculation) return;

    try {

        const result = calculate(expression);

        screen.value = result;

        blockBlast();

    } catch (error) {

        console.warn("Calculation error:", error);

        screen.value = "Error";

        restart(calc, "shake");

        playSound("clear");
    }
}


/* =================================
   BUTTON INTERACTIONS
================================= */

document.querySelectorAll(".block").forEach((button) => {

    button.addEventListener("click", () => {

        const rect = button.getBoundingClientRect();

        button.classList.remove("pressed");

        void button.offsetWidth;

        button.classList.add("pressed");

        setTimeout(() => {
            button.classList.remove("pressed");
        }, 160);

        burst(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            5,
            45
        );
    });
});


/* =================================
   KEYBOARD SUPPORT
================================= */

document.addEventListener("keydown", (event) => {

    if (/^[0-9+\-*/.^()%!]$/.test(event.key)) {

        insert(event.key);
    }

    else if (event.key === "Enter" || event.key === "=") {

        event.preventDefault();

        equal();
    }

    else if (event.key === "Backspace") {

        backspace();
    }

    else if (event.key === "Escape") {

        clearScreen();
    }
});
