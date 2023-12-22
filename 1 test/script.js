
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