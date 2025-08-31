
// ==================== DOM ELEMENTS ====================
const inputElement1 = document.getElementById('inputContent1');
const outputElement1 = document.getElementById('outputContent1');
const keyInputElement = document.getElementById('keyInput');
const ocrOutputElement = document.getElementById('ocrOutput');
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

// ==================== OCR VERSION ====================
/**
 * Select tesseract version
 */
function loadTesseractIfNeeded() {
    return new Promise((resolve, reject) => {
        const version = document.getElementById('tesseractVersion')?.value || '5';
        const noCache = document.getElementById('tesseractNoCache')?.checked;
        const timestamp = noCache ? `?t=${Date.now()}` : '';
        const src = `https://cdn.jsdelivr.net/npm/tesseract.js@${version}/dist/tesseract.min.js${timestamp}`;

        const existingScript = document.querySelector('script[data-tesseract]');
        if (existingScript && existingScript.src.includes(`@${version}/`) && !noCache) {
            resolve(); 
            return;
        }

        if (existingScript) existingScript.remove();

        const script = document.createElement('script');
        script.src = src;
        script.dataset.tesseract = 'true';
        script.onload = () => {
            notificationManager?.showNotification(`Tesseract.js v${version} loaded${noCache ? ' (no-cache)' : ''}`, { unique: true });
            resolve();
        };
        script.onerror = () => {
            notificationManager?.showNotification(`Failed to load Tesseract.js v${version}`, { unique: true });
            reject(new Error("Tesseract load failed"));
        };

        document.head.appendChild(script);
    });
}


// ==================== OCR FUNCTIONALITY ====================
/**
 * Draws PUA characters onto the canvas and performs OCR.
 */
async function drawPUAToCanvas() {
    try {
        await loadTesseractIfNeeded();
    } catch (err) {
        console.error("OCR initialization aborted due to failed script load.");
        return;
    }

    if (typeof Tesseract === 'undefined') {
        notificationManager.showNotification("Tesseract.js failed to initialize.", { unique: true });
        return;
    }

    if (puaCharList.length === 0) {
        console.log("No PUA characters to draw.");
        return;
    }

    const versionSelect = document.getElementById('tesseractVersion');
    const selectedVersion = versionSelect?.value || 'unknown';

    const container = document.getElementById('inputContainer3');
    container.style.display = 'flex';
    container.innerHTML = '';

    const instructionHeading = document.createElement('h4');
    instructionHeading.textContent = 'Verify OCR: Copy characters from here if manual replacement needed';
    container.appendChild(instructionHeading);

    const innerWrapper = document.createElement('div');
    innerWrapper.classList.add('ocr-group-wrapper');
    container.appendChild(innerWrapper);

    puaToOcrMap.clear();
    let ocrCompletedCount = 0;

    const chunks = [];
    let i = 0;
    while (i < puaCharList.length) {
        const remaining = puaCharList.length - i;
        if (remaining === 1 && chunks.length > 0) {
            chunks[chunks.length - 1].push(puaCharList[i]);
            break;
        }
        const groupSize = remaining >= 3 ? 3 : 2;
        chunks.push(puaCharList.slice(i, i + groupSize));
        i += groupSize;
    }

    // scrollToBottom();

    const runningNotif = notificationManager.showNotification(
        `Running OCR (Tesseract v${selectedVersion}) on all characters, please wait...`,
        { unique: true }
    );

    const fontSize = parseInt(document.getElementById('ocrFontSize')?.value) || 20;
    const charMargin = parseInt(document.getElementById('ocrCharMargin')?.value) || 10;
    const sidePadding = parseInt(document.getElementById('ocrSidePadding')?.value) || 10;

    chunks.forEach((charGroup, groupIndex) => {
        const wrapper = document.createElement('div');
        wrapper.classList.add('char-wrapper');

        const charCount = charGroup.length;
        const canvasWidth = sidePadding * 2 + (fontSize + charMargin) * charCount - charMargin;
        const canvasHeight = Math.ceil(fontSize * 1.5);

        const miniCanvas = document.createElement('canvas');
        miniCanvas.width = canvasWidth;
        miniCanvas.height = canvasHeight;
        miniCanvas.classList.add('char-canvas');

        const ctx = miniCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        ctx.fillStyle = '#000000';
        ctx.font = `${fontSize}px 'jjwxcfont', Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const totalCharWidth = (fontSize + charMargin) * charCount - charMargin;
        let currentX = (canvasWidth - totalCharWidth) / 2 + fontSize / 2;
        const centerY = canvasHeight / 2;

        charGroup.forEach(char => {
            ctx.fillText(char, currentX, centerY);
            currentX += fontSize + charMargin;
        });

        const resultDiv = document.createElement('div');
        resultDiv.classList.add('textBox', 'ocr-pending');
        resultDiv.textContent = '...';

        wrapper.appendChild(miniCanvas);
        wrapper.appendChild(resultDiv);
        innerWrapper.appendChild(wrapper);

        Tesseract.recognize(
            miniCanvas,
            'chi_sim',
            {
                logger: m => console.log(`OCR ${groupIndex + 1}/${chunks.length}`, m)
            }
        ).then(({ data: { text } }) => {
            const recognized = text.replace(/\s/g, '').slice(0, charGroup.length) || '';
            const resultArray = recognized.split('');

            if (resultArray.length === charGroup.length) {
                resultDiv.textContent = resultArray.join(' ');
                resultDiv.classList.remove('ocr-pending');
                charGroup.forEach((char, idx) => {
                    puaToOcrMap.set(char, resultArray[idx] || '');
                });
                updateOutputWithOCR();
            } else {
                resultDiv.textContent = resultArray.join(' ');
                resultDiv.classList.remove('ocr-pending');
                notificationManager.showNotification(`OCR Failed or Detected Extra Content for group ${groupIndex + 1}`, { unique: true });
            }
        }).catch(err => {
            console.error(`OCR Error for group ${groupIndex + 1}:`, err);
            resultDiv.textContent = '✖';
            resultDiv.classList.remove('ocr-pending');
            notificationManager.showNotification(`OCR Failed for group ${groupIndex + 1}`, { unique: true });
            scrollToBottom();
        }).finally(() => {
            ocrCompletedCount++;
            if (ocrCompletedCount === chunks.length) {
                if (runningNotif?.close) runningNotif.close();
                notificationManager.showNotification(`OCR Complete (Tesseract v${selectedVersion})`, { unique: true, duration: 3000 });
                scrollToBottom();
            }
        });
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
    
        // If unique is true and the message is already displayed, return null
        if (unique && activeNotifications.has(message)) {
            return null;
        }
    
        const notificationBox = document.createElement("div");
        notificationBox.classList.add("notifications");
        notificationBox.innerHTML = `
            <button class="closeButt" onclick="removeNotification(this)">x</button>
            <div class="notifContent">${message}</div>
        `;
    
        notificationsContainer.appendChild(notificationBox);
        notificationsContainer.style.display = "block"; // Ensure it's visible
    
        if (unique) {
            activeNotifications.add(message);
        }
    
        const autoDuration = duration !== null ? duration : Math.min(Math.max(message.length * 100, 1000), 10000);
    
        const timeoutId = setTimeout(() => removeNotification(notificationBox), autoDuration);
    
        // Return a handle with a .close() method to allow manual dismissal
        return {
            close: () => {
                clearTimeout(timeoutId); // Prevent auto-dismiss
                removeNotification(notificationBox);
            }
        };
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
    let formattedText = outputElement.innerText;

    formattedText = formattedText.replace(/\u200C/g, "");

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
    notificationManager.showNotification("Please consider donating to ko-fi or sharing if you find this project useful.");
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



// ==================== SCROLL DOWN BUTTON ====================

const scrolltobottomofpage = document.getElementById('scrolldown');

scrolltobottomofpage.addEventListener('click', function () {
    scrollToBottom();
});


// ==================== DOWNLOAD TEXT ====================
/**
 * Download to txt file basically
 */
function saveDivAsText() {
    let divContent = document.getElementById('outputContent1').innerText;
    divContent = divContent.replace(/\u200C/g, "");
    const blob = new Blob([divContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OUTPUT.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}