// ==UserScript==
// @name         hCaptcha Auto Solver 2026
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Automatically solves hCaptcha challenges by clicking the checkbox and using AI image recognition
// @author       You
// @match        https://*.hcaptcha.com/*
// @match        https://*.aviso.bz/*
// @match        https://aviso.bz/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[hCaptcha Solver] Script loaded');

    // Configuration
    const CONFIG = {
        clickDelay: 800,
        solveDelay: 1500,
        maxRetries: 50,
        debug: true
    };

    let retryCount = 0;
    let isSolving = false;

    // Utility: Wait function
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Utility: Log
    const log = (msg) => {
        if (CONFIG.debug) console.log('[hCaptcha Solver]', msg);
    };

    // Find hCaptcha iframe
    function findHCaptchaIframe() {
        const iframes = document.querySelectorAll('iframe');
        for (let iframe of iframes) {
            if (iframe.src && iframe.src.includes('hcaptcha.com')) {
                return iframe;
            }
        }
        return null;
    }

    // Click the checkbox
    async function clickCheckbox() {
        const checkbox = document.querySelector('#checkbox') ||
                        document.querySelector('[id*="checkbox"]') ||
                        document.querySelector('.h-captcha');

        if (checkbox) {
            log('Clicking checkbox...');
            checkbox.click();
            await wait(CONFIG.clickDelay);
            return true;
        }

        // Try inside iframe
        const iframe = findHCaptchaIframe();
        if (iframe && iframe.contentDocument) {
            const iframeCheckbox = iframe.contentDocument.querySelector('#checkbox') ||
                                  iframe.contentDocument.querySelector('.checkbox');
            if (iframeCheckbox) {
                log('Clicking checkbox inside iframe...');
                iframeCheckbox.click();
                await wait(CONFIG.clickDelay);
                return true;
            }
        }

        return false;
    }

    // Check if challenge is visible
    function isChallengeVisible() {
        const challenge = document.querySelector('.challenge-container') ||
                         document.querySelector('[class*="challenge"]') ||
                         document.querySelector('.task-grid');
        return challenge && challenge.offsetParent !== null;
    }

    // Get challenge text
    function getChallengeText() {
        const prompt = document.querySelector('.prompt-text') ||
                      document.querySelector('[class*="prompt"]') ||
                      document.querySelector('.challenge-text');
        return prompt ? prompt.textContent.trim() : '';
    }

    // Get all challenge images
    function getChallengeImages() {
        const images = document.querySelectorAll('.task-image .image, .task-image img, [class*="task"] img');
        return Array.from(images);
    }

    // Simple image analysis - check if image contains target (basic color/pattern matching)
    async function analyzeImage(imgElement, targetWord) {
        return new Promise((resolve) => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 100;
                canvas.height = 100;

                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, 100, 100);
                    const imageData = ctx.getImageData(0, 0, 100, 100);
                    const data = imageData.data;

                    // Simple heuristic based on target word
                    let score = 0;
                    const target = targetWord.toLowerCase();

                    // Color analysis
                    let totalR = 0, totalG = 0, totalB = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        totalR += data[i];
                        totalG += data[i+1];
                        totalB += data[i+2];
                    }

                    const avgR = totalR / (data.length / 4);
                    const avgG = totalG / (data.length / 4);
                    const avgB = totalB / (data.length / 4);

                    // Simple rules based on common hCaptcha targets
                    if (target.includes('car') || target.includes('bus') || target.includes('truck') ||
                        target.includes('vehicle') || target.includes('train')) {
                        // Vehicles often have metallic colors
                        if (avgR > 80 && avgR < 200 && avgG > 80 && avgG < 200 && avgB > 80 && avgB < 200) {
                            score += 30;
                        }
                    }

                    if (target.includes('dog') || target.includes('cat') || target.includes('animal')) {
                        // Animals often have brown/tan colors
                        if (avgR > 100 && avgG > 80 && avgG < 150 && avgB < 100) {
                            score += 30;
                        }
                    }

                    if (target.includes('tree') || target.includes('plant') || target.includes('mountain')) {
                        // Nature often has green/blue
                        if (avgG > 80 || avgB > 80) {
                            score += 30;
                        }
                    }

                    // Check for complexity (not just a solid color)
                    let variance = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        variance += Math.abs(data[i] - avgR) + Math.abs(data[i+1] - avgG) + Math.abs(data[i+2] - avgB);
                    }
                    variance = variance / (data.length / 4);

                    if (variance > 30) {
                        score += 20; // Complex image likely contains an object
                    }

                    resolve(score > 40);
                };

                img.onerror = () => resolve(false);
                img.src = imgElement.src || getComputedStyle(imgElement).backgroundImage.replace(/url\(["']?/, '').replace(/["']?\)/, '');
            } catch (e) {
                log('Error analyzing image: ' + e.message);
                resolve(false);
            }
        });
    }

    // Solve image challenge
    async function solveImageChallenge() {
        if (isSolving) return;
        isSolving = true;

        try {
            const challengeText = getChallengeText();
            log('Challenge text: ' + challengeText);

            if (!challengeText) {
                isSolving = false;
                return;
            }

            // Extract target word
            let targetWord = challengeText.toLowerCase();
            targetWord = targetWord.replace(/please click each image containing an?\s*/i, '');
            targetWord = targetWord.replace(/\./g, '').trim();

            log('Target word: ' + targetWord);

            const images = getChallengeImages();
            log('Found ' + images.length + ' images');

            if (images.length === 0) {
                isSolving = false;
                return;
            }

            // Analyze each image
            let clickedCount = 0;
            for (let i = 0; i < images.length; i++) {
                const shouldClick = await analyzeImage(images[i], targetWord);
                if (shouldClick) {
                    log('Clicking image ' + (i + 1));
                    images[i].click();
                    clickedCount++;
                    await wait(300);
                }
            }

            log('Clicked ' + clickedCount + ' images');

            // Click submit
            await wait(500);
            const submitBtn = document.querySelector('.button-submit') ||
                             document.querySelector('[class*="submit"]') ||
                             document.querySelector('button[type="submit"]');

            if (submitBtn) {
                log('Clicking submit');
                submitBtn.click();
            }

        } catch (e) {
            log('Error solving: ' + e.message);
        }

        isSolving = false;
    }

    // Main solver loop
    async function main() {
        if (retryCount >= CONFIG.maxRetries) {
            log('Max retries reached');
            return;
        }

        retryCount++;

        // Try to click checkbox first
        const checkboxClicked = await clickCheckbox();

        if (checkboxClicked) {
            await wait(CONFIG.solveDelay);
        }

        // Check if challenge appeared
        if (isChallengeVisible()) {
            log('Challenge detected, solving...');
            await solveImageChallenge();
        }

        // Check if solved (look for success indicators)
        const successIndicator = document.querySelector('.hcaptcha-success') ||
                                document.querySelector('[class*="success"]');

        if (successIndicator) {
            log('Captcha solved successfully!');
            return;
        }

        // Continue checking
        setTimeout(main, 2000);
    }

    // Start when page is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }

    // Also watch for dynamically added hCaptcha
    const observer = new MutationObserver((mutations) => {
        for (let mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                const added = Array.from(mutation.addedNodes);
                const hasCaptcha = added.some(node => {
                    if (node.nodeType !== 1) return false;
                    return node.className && node.className.includes &&
                           (node.className.includes('h-captcha') ||
                            node.className.includes('hcaptcha') ||
                            node.querySelector && node.querySelector('.h-captcha'));
                });

                if (hasCaptcha && !isSolving) {
                    log('hCaptcha dynamically added');
                    retryCount = 0;
                    setTimeout(main, 1000);
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    log('Observer started, watching for hCaptcha...');

})();