
// ==================== DOM ELEMENTS ====================
const inputElement1 = document.getElementById('inputContent1');
const outputElement1 = document.getElementById('outputContent1');
const keyInputElement = document.getElementById('keyInput');
const ocrOutputElement = document.getElementById('ocrOutput');
const ocrResultElement = document.getElementById('ocrRESULT');
const dynamicStyles = document.getElementById('dynamic-styles');
const puaCanvas = document.getElementById('puaCanvas');
const updateCanvasButton = document.getElementById('updateCanvasButton');

// ==================== DATA STRUCTURES ====================
let puaToOcrMap = new Map(); // Maps PUA characters to their OCR results
let puaCharList = []; // List of unique PUA characters found in the input
let notificationDisplayed = false; // Flag to track if the notification has been displayed

// ==================== FONT APPLICATION ====================
/**
 * Applies a custom font dynamically based on the key input.
 */
function applyFont() {
    const keyValue = keyInputElement.innerText.trim();
    if (keyValue) {
        const fontUrlBase = `//static.jjwxc.net/tmp/fonts/jjwxcfont_${keyValue}`;
        const fontStyle = `
            @font-face {
                font-family: 'jjwxcfont'; 
                src: url('${fontUrlBase}.woff2?h=my.jjwxc.net') format('woff2');
            }
            #outputContent1, #ocrOutput, #puaCanvas {
                font-family: 'jjwxcfont', sans-serif !important;
            }
            #inputContent1 {
                font-family: 'jjwxcfont', sans-serif !important; 
            }
        `;
        dynamicStyles.innerHTML = fontStyle;
    } else {
        dynamicStyles.innerHTML = ''; // Clear the font if keyValue is empty
    }
}

// ==================== CONTENT DECODING ====================
/**
 * Updates the output content based on the input content.
 * Highlights PUA characters in red and applies OCR results.
 */
function updateOutput() {
    let inputText = inputElement1.innerHTML;

    // Normalize the input text by replacing divs with line breaks
    inputText = inputText.replace(/<div><br><\/div>/g, '<br>')
        .replace(/<div>/g, '<br>')
        .replace(/<\/div>/g, '')
        .replace(/^<br>/, '') // Remove leading <br>
        .replace(/\n/g, '<br>');

    // Highlight PUA characters in red
    let highlightedInputText = inputText.replace(/([\uE000-\uF8FF])/g, '<span class="red-font">$1</span>');

    inputElement1.innerHTML = highlightedInputText;
    outputElement1.innerHTML = applyRedFontToPUA(inputText);

    // Count and display PUA characters
    countPUAChars(inputElement1.innerText);

    // Restore cursor position to prevent jumps
    placeCaretAtEnd(inputElement1);
}

/**
 * Counts the occurrences of PUA characters in the input text.
 * @param {string} text - The input text to analyze.
 */
function countPUAChars(text) {
    puaCharList = [];
    let puaMap = {};

    for (let char of text) {
        if (/[-]/.test(char)) {
            puaMap[char] = (puaMap[char] || 0) + 1;
            if (!puaCharList.includes(char)) {
                puaCharList.push(char);
            }
        }
    }

    let output = "<div class='grid-container'>";
    for (let char of puaCharList) {
        let ocrChar = puaToOcrMap.get(char) || "";
        output += `<div class="grid-item">
                        <span>${puaMap[char]} - ${char}</span>
                        <div class="editable" contenteditable="plaintext-only" oninput="updateManualOverride('${char}', this.textContent)">${ocrChar}</div>
                    </div>`;
    }
    output += "</div>";
    ocrOutputElement.innerHTML = output;
}


/**
 * Applies red font to PUA characters in the given text.
 * @param {string} text - The text to process.
 * @returns {string} - The processed text with PUA characters highlighted in red.
 */
function applyRedFontToPUA(text) {
    return text.replace(/([-])/g, '<span class="red-font">$1</span>');
}

/**
 * Updates the output content with OCR results.
 */
function updateOutputWithOCR() {
    let originalHTML = inputElement1.innerHTML;
    let modifiedHTML = originalHTML.replace(/([-])/g, (match) => {
        return puaToOcrMap.has(match)
            ? `<span class='green-font'>${puaToOcrMap.get(match)}</span>`
            : `<span class='red-font'>${match}</span>`;
    });

    outputElement1.innerHTML = modifiedHTML;
    countPUAChars(inputElement1.innerText); 
}

/**
 * Allows manual override of OCR results.
 * @param {string} char - The original PUA character.
 * @param {string} newValue - The manually entered replacement.
 */
function updateManualOverride(char, newValue) {
    if (newValue.trim()) {
        puaToOcrMap.set(char, newValue);
        updateOutputWithOCR();
    }
}

// ==================== OCR FUNCTIONALITY ====================
/**
 * Draws PUA characters onto the canvas and performs OCR.
 */
function drawPUAToCanvas() {
    let ctx = puaCanvas.getContext("2d");

    if (puaCharList.length === 0) {
        console.log("No PUA characters to draw.");
        return;
    }

    document.getElementById('inputContainer3').style.display = 'flex';

    let charSpacing = 40;
    let maxWidth = window.innerWidth - 20;
    let canvasWidth = Math.min(maxWidth, Math.max(500, puaCharList.length * charSpacing + 10));
    let canvasHeight = 80;

    puaCanvas.width = canvasWidth;
    puaCanvas.height = canvasHeight;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = "black";
    ctx.font = "20px 'jjwxcfont', Arial";

    let xPos = 10;
    puaToOcrMap.clear();

    for (let i = 0; i < puaCharList.length; i++) {
        let char = puaCharList[i];
        ctx.fillText(char, xPos, 50);
        xPos += charSpacing;
    }

    console.log("Canvas updated with PUA characters:", puaCharList);

    // Perform OCR on the canvas
    Tesseract.recognize(
        puaCanvas,
        'chi_sim',
        {
            logger: m => console.log(m)
        }
    ).then(({ data: { text } }) => {
        console.log("OCR Result:", text);
        ocrResultElement.textContent = text;

        let cleanedOCRText = text.replace(/\s/g, '');

        if (cleanedOCRText.length !== puaCharList.length) {
            notificationManager.showNotification("OCR Mismatch - Please manually complete the override section, you can scroll to the very bottom to copy and paste the available ocr to match their respective characters", { unique: true });
            scrollToBottom();
            return;
        }

        for (let i = 0; i < puaCharList.length; i++) {
            puaToOcrMap.set(puaCharList[i], cleanedOCRText[i]);
        }

        updateOutputWithOCR();

        notificationManager.showNotification("Decode Complete", { unique: true });

        scrollToBottom();
    }).catch(err => {
        console.error("OCR Error:", err);
        notificationManager.showNotification("OCR Error: " + err.message, { unique: true });
        scrollToBottom();
    });
}

// ==================== UTILITY FUNCTIONS ====================
/**
 * Places the caret at the end of the given element.
 * @param {HTMLElement} el - The element to place the caret in.
 */
function placeCaretAtEnd(el) {
    el.focus();
    if (typeof window.getSelection !== "undefined" && document.createRange) {
        let range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }
}

/**
 * Scrolls the page to the bottom smoothly.
 */
function scrollToBottom() {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

// ==================== NOTIFICATION MANAGEMENT ====================
const notificationManager = (() => {
    const notificationsContainer = document.querySelector(".notifications-container");
    const activeNotifications = new Set(); // Track active notifications

    /**
     * Sample notification
     * // Show a unique notification
     * notificationManager.showNotification("This is a unique message", { unique: true });
     * 
     * // Show a non-unique notification
     * notificationManager.showNotification("This is a regular message");
     * 
     * // Show a notification with a custom duration
     * notificationManager.showNotification("This will disappear in 5 seconds", { duration: 5000 });
     * 
     * 
     * Displays a notification message.
     * @param {string} message - The message to display.
     * @param {object} options - Options for the notification.
     * @param {boolean} options.unique - If true, prevents duplicate notifications.
     * @param {number} options.duration - Custom duration for the notification (in ms).
     */
    function showNotification(message, options = {}) {
        const { unique = false, duration = null } = options;

        // If unique is true and the message is already displayed, return
        if (unique && activeNotifications.has(message)) {
            return;
        }

        const notificationBox = document.createElement("div");
        notificationBox.classList.add("notifications");
        notificationBox.innerHTML = `
            <button class="closeButt" onclick="removeNotification(this)">x</button>
            <div class="notifContent">${message}</div>
        `;

        notificationsContainer.appendChild(notificationBox);
        notificationsContainer.style.display = "block"; // Show the container

        // Add the message to the active notifications set
        if (unique) {
            activeNotifications.add(message);
        }

        // Calculate duration based on message length (100ms per character)
        const autoDuration = duration !== null ? duration : Math.min(Math.max(message.length * 100, 1000), 10000);

        // Auto-remove after calculated time
        setTimeout(() => removeNotification(notificationBox), autoDuration);
    }

    /**
     * Removes a notification.
     * @param {HTMLElement} element - The notification element to remove.
     */
    function removeNotification(element) {
        const notification = element.closest(".notifications");
        if (!notification) return;

        notification.style.animation = "fadeOut 0.3s forwards";
        setTimeout(() => {
            const message = notification.querySelector(".notifContent").textContent;
            activeNotifications.delete(message); // Remove from active notifications
            notification.remove();
            checkNotificationsContainer(); // Check if we need to hide the container
        }, 300);
    }

    /**
     * Checks if the notifications container should be hidden.
     */
    function checkNotificationsContainer() {
        if (!notificationsContainer.querySelector(".notifications")) {
            notificationsContainer.style.display = "none"; // Hide when empty
        }
    }

    return {
        showNotification,
        removeNotification,
        checkNotificationsContainer,
    };
})();

// Expose removeNotification to the global scope for use in HTML onclick
window.removeNotification = notificationManager.removeNotification;

// ==================== EVENT LISTENERS ====================
inputElement1.addEventListener('input', updateOutput);
keyInputElement.addEventListener('input', applyFont);
updateCanvasButton.addEventListener('click', drawPUAToCanvas);

// Copy Button
document.getElementById('copyButton').addEventListener('click', function () {
    const outputElement = document.getElementById('outputContent1');
    let formattedText = outputElement.innerText; // Preserves whitespace & only visible text

    const tempInput = document.createElement('textarea');
    tempInput.style.whiteSpace = "pre-wrap"; // Ensures whitespace is preserved
    tempInput.value = formattedText;
    document.body.appendChild(tempInput);
    tempInput.select();
    document.execCommand('copy');
    document.body.removeChild(tempInput);

    // Copy Button Alert
    notificationManager.showNotification("Copied to clipboard!");
});

// Notif when web loads
window.addEventListener('load', function () {
    notificationManager.showNotification("Thank you for using this project!<br><br>I hope you find this project helpful. Your support means a lot! If you'd like to support, please consider donating on Ko-Fi or sharing this project with others.<br><br>If you have feedback, join the Discord server to share your thoughts!");
    notificationManager.showNotification("If you encounter any issues, please report them to me. Your feedback is invaluable and helps me improve this project.");
});

// Ensure the container starts hidden
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector(".notifications-container").style.display = "none";
});

// ==================== DARK MODE TOGGLE ====================
const modeToggleButton = document.getElementById('modeToggle');
const body = document.body;

// Add the dark mode class to start
body.classList.add('dark-mode');

// Set the initial icon to moon (dark mode) and make it yellow
modeToggleButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="yellow" class="bi bi-moon-fill" viewBox="0 0 16 16">
    <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/>
    </svg>
`;

modeToggleButton.addEventListener('click', function () {
    body.classList.toggle('dark-mode');

    // Toggle between sun and moon icons
    if (body.classList.contains('dark-mode')) {
        modeToggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="yellow" class="bi bi-moon-fill" viewBox="0 0 16 16">
                <path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278"/>
            </svg>
        `;
    } else {
        modeToggleButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="#ff9600" class="bi bi-sun-fill" viewBox="0 0 16 16">
                <path d="M8 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0m0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13m8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5M3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8m10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0m-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0m9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707M4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 1 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708"/>
            </svg>
        `;
    }
});