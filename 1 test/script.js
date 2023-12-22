
document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.section');
    let currentSectionIndex = 0;

// Detect when the user scrolls
    window.addEventListener('scroll', function() {
// Find the current section based on the scroll position
        const scrollPosition = window.scrollY;
        const currentSection = Array.from(sections).findIndex(section => {
            const rect = section.getBoundingClientRect();
            return rect.top <= 0 && rect.bottom > 0;
        });

        if (currentSection !== -1 && currentSection !== currentSectionIndex) {
            currentSectionIndex = currentSection;
            console.log(`Current Section: ${currentSectionIndex + 1}`);
        }
    });

// Scroll to the next or previous section based on the scroll direction
    window.addEventListener('wheel', function(event) {
        const scrollDirection = event.deltaY > 0 ? 'down' : 'up';

        if (scrollDirection === 'down' && currentSectionIndex < sections.length - 1) {
            currentSectionIndex++;
        } else if (scrollDirection === 'up' && currentSectionIndex > 0) {
            currentSectionIndex--;
        }

        sections[currentSectionIndex].scrollIntoView({ behavior: 'smooth' });
    });



/*----------------------------------------------------------------  */



let startY = 0;
let lastScrollTime = 0;
const scrollCooldown = 500; // Set the cooldown period in milliseconds

// Detect when the user starts touching the screen
window.addEventListener('touchstart', function(event) {
    startY = event.touches[0].clientY;
});

// Detect when the user moves their finger
window.addEventListener('touchmove', function(event) {
    // Calculate the vertical distance moved
    const deltaY = event.touches[0].clientY - startY;

    // Set a threshold to determine if it's a swipe
    const swipeThreshold = 130;

    if (Math.abs(deltaY) > swipeThreshold) {
        const currentTime = new Date().getTime();

        // Check if enough time has passed since the last scroll
        if (currentTime - lastScrollTime > scrollCooldown) {
            const scrollDirection = deltaY > 0 ? 'up' : 'down'; // Reverse the conditions

            if (scrollDirection === 'down' && currentSectionIndex < sections.length - 1) {
                currentSectionIndex++;
            } else if (scrollDirection === 'up' && currentSectionIndex > 0) {
                currentSectionIndex--;
            }

            sections[currentSectionIndex].scrollIntoView({ behavior: 'smooth' });

            // Update the last scroll time
            lastScrollTime = currentTime;

            // Reset startY to prevent continuous scrolling
            startY = event.touches[0].clientY;
        }
    }
});

});

document.addEventListener('DOMContentLoaded', function() {
    const sections = document.querySelectorAll('.section');
    let currentSectionIndex = 0;

});

document.querySelector('.topButt').addEventListener('click', function() {
    const aboutSection = document.querySelector('.home');
    aboutSection.scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('.abtButt').addEventListener('click', function() {
    const aboutSection = document.querySelector('.about');
    aboutSection.scrollIntoView({ behavior: 'smooth' });
});

document.querySelector('.botButt').addEventListener('click', function() {
    const aboutSection = document.querySelector('.contact');
    aboutSection.scrollIntoView({ behavior: 'smooth' });
});