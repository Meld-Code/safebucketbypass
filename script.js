"use strict";
document.addEventListener("DOMContentLoaded", () => {
/* ============================================================
ELEMENTS
============================================================ */
const welcome =
    document.getElementById("welcome");

const enterSafeBucket =
    document.getElementById("enterSafeBucket");

const dontShowWelcome =
    document.getElementById("dontShowWelcome");

const dontShowTutorial =
    document.getElementById("dontShowTutorial");

const browser =
    document.getElementById("browser");

const browserFrame =
    document.getElementById("browserFrame");

const searchForm =
    document.getElementById("searchForm");

const searchInput =
    document.getElementById("searchInput");

const iconShortcuts =
    document.querySelectorAll(".iconShortcut");

const infoButton =
    document.getElementById("infoButton");

const infoOverlay =
    document.getElementById("infoOverlay");

const infoClose =
    document.getElementById("infoClose");

const settingsButton =
    document.getElementById("settingsButton");

const settingsOverlay =
    document.getElementById("settingsOverlay");

const settingsClose =
    document.getElementById("settingsClose");

const watchTutorialButton =
    document.getElementById("watchTutorialButton");

const closeBrowser =
    document.getElementById("closeBrowser");

const backButton =
    document.getElementById("backButton");

const forwardButton =
    document.getElementById("forwardButton");

const currentTime =
    document.getElementById("currentTime");

const currentDate =
    document.getElementById("currentDate");

const dateTime =
    document.getElementById("dateTime");

const grid =
    document.querySelector(".grid");

const noise =
    document.querySelector(".noise");

const gridToggle =
    document.getElementById("gridToggle");

const noiseToggle =
    document.getElementById("noiseToggle");

const dateToggle =
    document.getElementById("dateToggle");

/* ============================================================
   BASIC ELEMENT CHECK
============================================================ */

const requiredElements = {
    welcome,
    enterSafeBucket,
    dontShowWelcome,
    dontShowTutorial,
    browser,
    browserFrame,
    searchForm,
    searchInput,
    infoButton,
    infoOverlay,
    infoClose,
    settingsButton,
    settingsOverlay,
    settingsClose,
    closeBrowser,
    backButton,
    forwardButton,
    currentTime,
    currentDate,
    dateTime,
    grid,
    noise,
    gridToggle,
    noiseToggle,
    dateToggle
};

const missingElements =
    Object.entries(requiredElements)
        .filter(([, element]) => !element)
        .map(([name]) => name);

if (missingElements.length > 0) {
    console.error(
        "Safe Bucket is missing these elements:",
        missingElements
    );

    return;
}

/* ============================================================
   ANALYTICS
============================================================ */

function trackEvent(
    eventName,
    eventData = {}
) {
    if (
        window.firebaseAnalytics &&
        window.firebaseLogEvent
    ) {
        window.firebaseLogEvent(
            window.firebaseAnalytics,
            eventName,
            eventData
        );
    }
}

/* ============================================================
   WELCOME SCREEN
============================================================ */

if (
    localStorage.getItem(
        "safeBucketWelcomeHidden"
    ) === "true"
) {
    welcome.classList.add("hidden");
    dontShowWelcome.checked = true;
}

enterSafeBucket.addEventListener(
    "click",
    () => {
        if (dontShowWelcome.checked) {
            localStorage.setItem(
                "safeBucketWelcomeHidden",
                "true"
            );
        }

        welcome.classList.add("hidden");

        showTutorialPromptIfAllowed(500);
    }
);

/* ============================================================
   BACKGROUND SETTINGS
============================================================ */

gridToggle.addEventListener(
    "change",
    () => {
        grid.style.display =
            gridToggle.checked
                ? ""
                : "none";
    }
);

noiseToggle.addEventListener(
    "change",
    () => {
        noise.style.display =
            noiseToggle.checked
                ? ""
                : "none";
    }
);

/* ============================================================
   URL HANDLING
============================================================ */

function getDestination(value) {
    const cleanValue =
        value.trim();

    if (!cleanValue) {
        return null;
    }

    if (
        /^https?:\/\//i.test(
            cleanValue
        )
    ) {
        return cleanValue;
    }

    if (
        /^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i
            .test(cleanValue)
    ) {
        return "https://" + cleanValue;
    }

    return (
        "https://www.google.com/search?q=" +
        encodeURIComponent(cleanValue)
    );
}

/* ============================================================
   BROWSER
============================================================ */

function openBrowser(url) {
    if (!url) {
        return;
    }

    trackEvent(
        "open_site",
        {
            site_name: url
        }
    );

    browserFrame.src = url;
    browser.classList.add("open");
}

function closeBrowserWindow() {
    browser.classList.remove("open");
    browserFrame.src = "about:blank";
}

iconShortcuts.forEach(button => {
    button.addEventListener(
        "click",
        () => {
            const url =
                button.dataset.url;

            if (!url) {
                return;
            }

            trackEvent(
                "shortcut_click",
                {
                    shortcut_name:
                        button.dataset.name ||
                        "unknown"
                }
            );

            openBrowser(url);
        }
    );
});

searchForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const destination =
            getDestination(
                searchInput.value
            );

        if (!destination) {
            searchInput.focus();
            return;
        }

        trackEvent("search_used");

        openBrowser(destination);
        searchInput.blur();
    }
);

closeBrowser.addEventListener(
    "click",
    closeBrowserWindow
);

backButton.addEventListener(
    "click",
    () => {
        try {
            browserFrame
                .contentWindow
                .history
                .back();
        } catch (error) {
            console.warn(
                "Browser history is unavailable:",
                error
            );
        }
    }
);

forwardButton.addEventListener(
    "click",
    () => {
        try {
            browserFrame
                .contentWindow
                .history
                .forward();
        } catch (error) {
            console.warn(
                "Browser history is unavailable:",
                error
            );
        }
    }
);

/* ============================================================
   INFO PANEL
============================================================ */

infoButton.addEventListener(
    "click",
    () => {
        infoOverlay.classList.add("open");
    }
);

infoClose.addEventListener(
    "click",
    () => {
        infoOverlay.classList.remove("open");
    }
);

infoOverlay.addEventListener(
    "click",
    event => {
        if (
            event.target === infoOverlay
        ) {
            infoOverlay.classList.remove(
                "open"
            );
        }
    }
);

/* ============================================================
   SETTINGS PANEL
============================================================ */

settingsButton.addEventListener(
    "click",
    () => {
        settingsOverlay.classList.add("open");
    }
);

settingsClose.addEventListener(
    "click",
    () => {
        settingsOverlay.classList.remove(
            "open"
        );
    }
);

settingsOverlay.addEventListener(
    "click",
    event => {
        if (
            event.target === settingsOverlay
        ) {
            settingsOverlay.classList.remove(
                "open"
            );
        }
    }
);

/* ============================================================
   DATE AND TIME
============================================================ */

function updateDateTime() {
    const now = new Date();

    currentTime.textContent =
        now.toLocaleTimeString(
            undefined,
            {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit"
            }
        );

    currentDate.textContent =
        now.toLocaleDateString(
            undefined,
            {
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );
}

updateDateTime();

setInterval(
    updateDateTime,
    1000
);

dateToggle.addEventListener(
    "change",
    () => {
        dateTime.style.display =
            dateToggle.checked
                ? ""
                : "none";
    }
);

/* ============================================================
   RANDOM ADS
============================================================ */

const randomAd =
    document.getElementById("randomAd");

const closeRandomAd =
    document.getElementById(
        "closeRandomAd"
    );

const randomAdButton =
    document.getElementById(
        "randomAdButton"
    );

const randomAdTitle =
    document.getElementById(
        "randomAdTitle"
    );

const randomAdText =
    document.getElementById(
        "randomAdText"
    );

const adList = [
    {
        title: "Try Safe Bucket",
        text:
            "Quick access to games, tools, websites, and more.",
        button: "Open Safe Bucket",
        url: "index.html"
    },

    {
        title: "Play Some Games",
        text:
            "Find games and other fun websites in one place.",
        button: "Open Games",
        url:
            "https://safebucketbypass.github.io/safebucketbypass/RealGPagePlus.html"
    },

    {
        title: "Visit CiphAnon Studios",
        text:
            "Explore more projects created by CiphAnon Studios.",
        button: "Visit Studio",
        url:
            "https://ciphanonstudios.github.io/CiphAnonStudios-v12"
    },

    {
        title: "Check Out Minecraft",
        text:
            "Open the Minecraft section and start playing.",
        button: "Open Minecraft",
        url:
            "https://safebucketbypass.github.io/MC/"
    },

    {
        title: "Explore Anime",
        text:
            "Find anime content through Safe Bucket.",
        button: "Open Anime",
        url:
            "https://safebucketbypass.github.io/safebucketbypass/ComingSoon.html"
    }
];

let currentAd = null;
let adTimer = null;
let adHideTimer = null;
let lastAdIndex = -1;

function getRandomAd() {
    let index;

    do {
        index =
            Math.floor(
                Math.random() *
                adList.length
            );
    } while (
        adList.length > 1 &&
        index === lastAdIndex
    );

    lastAdIndex = index;

    return adList[index];
}

function hideRandomAd() {
    if (!randomAd) {
        return;
    }

    randomAd.classList.remove(
        "show"
    );

    if (adHideTimer) {
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

    randomAdTitle.textContent =
        currentAd.title;

    randomAdText.textContent =
        currentAd.text;

    randomAdButton.textContent =
        currentAd.button;

    randomAd.classList.add(
        "show"
    );

    if (adHideTimer) {
        clearTimeout(adHideTimer);
    }

    adHideTimer =
        setTimeout(
            hideRandomAd,
            12000
        );
}

function scheduleRandomAd() {
    if (!randomAd) {
        return;
    }

    if (adTimer) {
        clearTimeout(adTimer);
    }

    const minimumDelay = 20000;
    const maximumDelay = 60000;

    const delay =
        Math.floor(
            Math.random() *
            (
                maximumDelay -
                minimumDelay
            ) +
            minimumDelay
        );

    adTimer =
        setTimeout(
            () => {
                showRandomAd();
                scheduleRandomAd();
            },
            delay
        );
}

if (closeRandomAd) {
    closeRandomAd.addEventListener(
        "click",
        () => {
            hideRandomAd();
            scheduleRandomAd();
        }
    );
}

if (randomAdButton) {
    randomAdButton.addEventListener(
        "click",
        () => {
            if (currentAd?.url) {
                openBrowser(
                    currentAd.url
                );
            }

            hideRandomAd();
            scheduleRandomAd();
        }
    );
}

scheduleRandomAd();

/* ============================================================
   TUTORIAL
============================================================ */

const tutorialOverlay =
    document.getElementById(
        "tutorialOverlay"
    );

const tutorialPrompt =
    document.getElementById(
        "tutorialPrompt"
    );

const tutorialCard =
    document.getElementById(
        "tutorialCard"
    );

const tutorialHighlight =
    document.getElementById(
        "tutorialHighlight"
    );

const tutorialStartButton =
    document.getElementById(
        "tutorialStartButton"
    );

const tutorialSkipButton =
    document.getElementById(
        "tutorialSkipButton"
    );

const tutorialExitButton =
    document.getElementById(
        "tutorialExitButton"
    );

const tutorialNextButton =
    document.getElementById(
        "tutorialNextButton"
    );

const tutorialTitle =
    document.getElementById(
        "tutorialTitle"
    );

const tutorialText =
    document.getElementById(
        "tutorialText"
    );

const tutorialStepIcon =
    document.getElementById(
        "tutorialStepIcon"
    );

const tutorialProgress =
    document.getElementById(
        "tutorialProgress"
    );

const tutorialElements = {
    tutorialOverlay,
    tutorialPrompt,
    tutorialCard,
    tutorialHighlight,
    tutorialStartButton,
    tutorialSkipButton,
    tutorialExitButton,
    tutorialNextButton,
    tutorialTitle,
    tutorialText,
    tutorialStepIcon,
    tutorialProgress,
    watchTutorialButton
};

const missingTutorialElements =
    Object.entries(
        tutorialElements
    )
        .filter(([, element]) => !element)
        .map(([name]) => name);

if (
    missingTutorialElements.length > 0
) {
    console.error(
        "Safe Bucket tutorial is missing:",
        missingTutorialElements
    );

    return;
}

const tutorialSteps = [
    {
        selector: "#searchForm",
        icon:
            "fa-solid fa-magnifying-glass",
        title: "Search the web",
        text:
            "Enter a website or search term in this bar, then press the arrow button to open it in the built-in browser."
    },

    {
        selector: "#iconShortcuts",
        icon: "fa-solid fa-bolt",
        title: "Shortcut cards",
        text:
            "These cards open your main Safe Bucket destinations. Click a card to launch the selected website."
    },

    {
        selector: "#infoButton",
        icon:
            "fa-solid fa-circle-info",
        title: "Information",
        text:
            "This bottom-right button opens information about Safe Bucket."
    },

    {
        selector: "#settingsButton",
        icon: "fa-solid fa-gear",
        title: "Settings",
        text:
            "This button is above Information. Use it to control the grid, noise, date/time, and tutorial."
    },

    {
        selector: ".discordButton",
        icon:
            "fa-brands fa-discord",
        title: "Discord",
        text:
            "This button is above Settings and opens the Safe Bucket Discord invite."
    },

    {
        selector: "#dateTime",
        icon: "fa-solid fa-clock",
        title: "Date and time",
        text:
            "This card stays in the bottom-left corner. Hover over it to enlarge the time and date."
    }
];

let tutorialIndex = 0;
let tutorialPositionFrame = null;

function shouldShowTutorial() {
    return (
        localStorage.getItem(
            "safeBucketTutorialDisabled"
        ) !== "true"
    );
}

function showTutorialPromptIfAllowed(
    delay = 0
) {
    if (
        !shouldShowTutorial()
    ) {
        return;
    }

    setTimeout(
        openTutorialPrompt,
        delay
    );
}

function saveTutorialPreference() {
    if (
        dontShowTutorial.checked
    ) {
        localStorage.setItem(
            "safeBucketTutorialDisabled",
            "true"
        );
    } else {
        localStorage.removeItem(
            "safeBucketTutorialDisabled"
        );
    }
}

function clearTutorialTarget() {
    document
        .querySelectorAll(
            ".tutorialTarget"
        )
        .forEach(element => {
            element.classList.remove(
                "tutorialTarget"
            );
        });
}

function openTutorialPrompt() {
    tutorialOverlay.classList.add(
        "open"
    );

    tutorialOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    tutorialPrompt.hidden = false;
    tutorialCard.hidden = true;

    tutorialHighlight.classList.remove(
        "active"
    );

    clearTutorialTarget();
}

function closeTutorial() {
    tutorialOverlay.classList.remove(
        "open"
    );

    tutorialOverlay.setAttribute(
        "aria-hidden",
        "true"
    );

    tutorialPrompt.hidden = true;
    tutorialCard.hidden = true;

    tutorialHighlight.classList.remove(
        "active"
    );

    clearTutorialTarget();
}

function finishTutorial() {
    saveTutorialPreference();
    closeTutorial();
}

function buildTutorialProgress() {
    tutorialProgress.replaceChildren();

    tutorialSteps.forEach(
        (_, index) => {
            const dot =
                document.createElement(
                    "span"
                );

            if (
                index ===
                tutorialIndex
            ) {
                dot.classList.add(
                    "active"
                );
            }

            tutorialProgress.appendChild(
                dot
            );
        }
    );
}

function getTutorialTarget() {
    const step =
        tutorialSteps[
            tutorialIndex
        ];

    if (!step) {
        return null;
    }

    return document.querySelector(
        step.selector
    );
}

function getTargetRect(target) {
    const rect =
        target.getBoundingClientRect();

    const padding = 7;

    return {
        top: Math.max(
            4,
            rect.top - padding
        ),

        left: Math.max(
            4,
            rect.left - padding
        ),

        right: Math.min(
            window.innerWidth - 4,
            rect.right + padding
        ),

        bottom: Math.min(
            window.innerHeight - 4,
            rect.bottom + padding
        ),

        width: Math.min(
            window.innerWidth - 8,
            rect.width +
            padding * 2
        ),

        height: Math.min(
            window.innerHeight - 8,
            rect.height +
            padding * 2
        )
    };
}

function setHighlightPosition(rect) {
    tutorialHighlight.style.top =
        `${rect.top}px`;

    tutorialHighlight.style.left =
        `${rect.left}px`;

    tutorialHighlight.style.width =
        `${rect.width}px`;

    tutorialHighlight.style.height =
        `${rect.height}px`;

    tutorialHighlight.classList.add(
        "active"
    );
}

function getTutorialCardSize() {
    const rect =
        tutorialCard.getBoundingClientRect();

    return {
        width: rect.width,
        height: rect.height
    };
}

function rectanglesOverlap(
    first,
    second,
    gap = 18
) {
    return !(
        first.right + gap <=
            second.left ||
        first.left >=
            second.right + gap ||
        first.bottom + gap <=
            second.top ||
        first.top >=
            second.bottom + gap
    );
}

function getCandidateCardPositions(
    targetRect,
    cardSize
) {
    const gap = 24;

    return [
        {
            left:
                targetRect.left +
                targetRect.width / 2 -
                cardSize.width / 2,

            top:
                targetRect.bottom +
                gap
        },

        {
            left:
                targetRect.left +
                targetRect.width / 2 -
                cardSize.width / 2,

            top:
                targetRect.top -
                cardSize.height -
                gap
        },

        {
            left:
                targetRect.right +
                gap,

            top:
                targetRect.top +
                targetRect.height / 2 -
                cardSize.height / 2
        },

        {
            left:
                targetRect.left -
                cardSize.width -
                gap,

            top:
                targetRect.top +
                targetRect.height / 2 -
                cardSize.height / 2
        },

        {
            left:
                targetRect.right -
                cardSize.width,

            top:
                targetRect.top -
                cardSize.height -
                gap
        },

        {
            left:
                targetRect.right -
                cardSize.width,

            top:
                targetRect.bottom +
                gap
        },

        {
            left:
                targetRect.left,

            top:
                targetRect.top -
                cardSize.height -
                gap
        },

        {
            left:
                targetRect.left,

            top:
                targetRect.bottom +
                gap
        }
    ];
}

function clampCardPosition(
    position,
    cardSize
) {
    const margin = 15;

    return {
        left: Math.min(
            Math.max(
                margin,
                position.left
            ),
            Math.max(
                margin,
                window.innerWidth -
                cardSize.width -
                margin
            )
        ),

        top: Math.min(
            Math.max(
                margin,
                position.top
            ),
            Math.max(
                margin,
                window.innerHeight -
                cardSize.height -
                margin
            )
        )
    };
}

function getBestCardPosition(
    targetRect,
    cardSize
) {
    return getCandidateCardPositions(
        targetRect,
        cardSize
    )
        .map(candidate => {
            const clamped =
                clampCardPosition(
                    candidate,
                    cardSize
                );

            const cardRect = {
                left: clamped.left,
                top: clamped.top,
                right:
                    clamped.left +
                    cardSize.width,
                bottom:
                    clamped.top +
                    cardSize.height
            };

            const overlaps =
                rectanglesOverlap(
                    cardRect,
                    targetRect
                );

            const distance =
                Math.abs(
                    clamped.left -
                    candidate.left
                ) +
                Math.abs(
                    clamped.top -
                    candidate.top
                );

            return {
                ...clamped,
                overlaps,
                distance
            };
        })
        .sort(
            (first, second) => {
                if (
                    first.overlaps !==
                    second.overlaps
                ) {
                    return first.overlaps
                        ? 1
                        : -1;
                }

                return (
                    first.distance -
                    second.distance
                );
            }
        )[0];
}

function positionTutorialCard(
    targetRect
) {
    const cardSize =
        getTutorialCardSize();

    const position =
        getBestCardPosition(
            targetRect,
            cardSize
        );

    tutorialCard.style.left =
        `${position.left}px`;

    tutorialCard.style.top =
        `${position.top}px`;

    tutorialCard.style.transform =
        "scale(1)";
}

function positionTutorial() {
    if (
        tutorialCard.hidden ||
        !tutorialOverlay.classList.contains(
            "open"
        )
    ) {
        return;
    }

    const target =
        getTutorialTarget();

    if (!target) {
        return;
    }

    clearTutorialTarget();

    target.classList.add(
        "tutorialTarget"
    );

    const targetRect =
        getTargetRect(target);

    setHighlightPosition(
        targetRect
    );

    positionTutorialCard(
        targetRect
    );
}

function scheduleTutorialPosition() {
    if (tutorialPositionFrame) {
        cancelAnimationFrame(
            tutorialPositionFrame
        );
    }

    tutorialPositionFrame =
        requestAnimationFrame(
            () => {
                tutorialPositionFrame =
                    null;

                positionTutorial();
            }
        );
}

function renderTutorialStep() {
    const step =
        tutorialSteps[
            tutorialIndex
        ];

    if (!step) {
        finishTutorial();
        return;
    }

    tutorialPrompt.hidden = true;
    tutorialCard.hidden = false;

    tutorialStepIcon.innerHTML =
        `<i class="${step.icon}"></i>`;

    tutorialTitle.textContent =
        step.title;

    tutorialText.textContent =
        step.text;

    tutorialNextButton.textContent =
        tutorialIndex ===
        tutorialSteps.length - 1
            ? "Finish"
            : "Next";

    buildTutorialProgress();

    tutorialCard.style.left = "15px";
    tutorialCard.style.top = "15px";
    tutorialCard.style.transform =
        "scale(.98)";

    requestAnimationFrame(
        () => {
            requestAnimationFrame(
                positionTutorial
            );
        }
    );
}

function startTutorial() {
    tutorialIndex = 0;

    saveTutorialPreference();

    tutorialOverlay.classList.add(
        "open"
    );

    tutorialOverlay.setAttribute(
        "aria-hidden",
        "false"
    );

    renderTutorialStep();
}

function nextTutorialStep() {
    if (
        tutorialIndex >=
        tutorialSteps.length - 1
    ) {
        finishTutorial();
        return;
    }

    tutorialIndex++;
    renderTutorialStep();
}

tutorialStartButton.addEventListener(
    "click",
    startTutorial
);

tutorialSkipButton.addEventListener(
    "click",
    finishTutorial
);

tutorialExitButton.addEventListener(
    "click",
    finishTutorial
);

tutorialNextButton.addEventListener(
    "click",
    nextTutorialStep
);

watchTutorialButton.addEventListener(
    "click",
    () => {
        settingsOverlay.classList.remove(
            "open"
        );

        dontShowTutorial.checked = false;

        localStorage.removeItem(
            "safeBucketTutorialDisabled"
        );

        setTimeout(
            openTutorialPrompt,
            250
        );
    }
);

window.addEventListener(
    "resize",
    scheduleTutorialPosition
);

window.addEventListener(
    "scroll",
    scheduleTutorialPosition,
    true
);

document.addEventListener(
    "keydown",
    event => {
        if (
            tutorialOverlay.classList.contains(
                "open"
            )
        ) {
            if (
                event.key ===
                "Escape"
            ) {
                finishTutorial();
            }

            if (
                event.key ===
                    "Enter" &&
                !tutorialPrompt.hidden
            ) {
                startTutorial();
            }

            if (
                event.key ===
                    "ArrowRight" &&
                !tutorialCard.hidden
            ) {
                nextTutorialStep();
            }
        }

        if (
            event.key ===
            "Escape"
        ) {
            closeBrowserWindow();

            infoOverlay.classList.remove(
                "open"
            );

            settingsOverlay.classList.remove(
                "open"
            );
        }
    }
);

/* ============================================================
   INITIAL TUTORIAL
============================================================ */

if (
    welcome.classList.contains(
        "hidden"
    )
) {
    showTutorialPromptIfAllowed(
        600
    );
}

});
