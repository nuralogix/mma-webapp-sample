/**
 * Renders the results in the designated container.
 * @param {Object} results - The processed results to display.
 * @param {Object} definitions - The point definitions for rendering.
 * @param {Array<Object>} sections - The sections to organize the results into.
 * @param {string} pageLocale - The locale of the page that will display the results.
 */
function renderResults(results, definitions, sections, pageLocale) {
    const container = document.getElementById('results-container');
    const timestamp = document.getElementById("timestamp");
    const measurementInfo = document.getElementById("measurementInfo");

    timestamp.innerHTML = Intl.DateTimeFormat(pageLocale, {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(results["timestamp"]);

    const snr = results["SNR"];
    if (snr && !isNaN(snr)) {
        const snrInfo = document.createElement('span')
        const snrPointDefinition = definitions["SNR"] || { key: "SNR" };
        const snrDisplayValue = formatResultValue(
            snr,
            snrPointDefinition.decimalPlaces,
            snrPointDefinition.units,
            pageLocale
        );
        snrInfo.id = "snrContainer";
        snrInfo.textContent = `SNR: ${snrDisplayValue} dB`;

        if (typeof PointInfoDialog !== 'undefined') {
            const snrOpenDialog = () => {
                const dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(snrPointDefinition, snr, pageLocale);
                PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, pageLocale);
            };
            snrInfo.appendChild(PointInfoDialog.createResultInfoIcon(pageLocale, snrOpenDialog));
        }

        measurementInfo.append(snrInfo);
    }

    const starRating = results["STAR_RATING"];
    if (starRating && !isNaN(starRating)) {
        const stars = document.createElement('span')
        stars.id = "starsContainer";
        for (let i = 1; i <= 5; i++) {
            const star = document.createElement('div');
            if (i <= starRating) {
                star.className = "star greenBackground";
            } else {
                star.className = "star greyBackground";
            }
            stars.append(star);
        }

        if (typeof PointInfoDialog !== 'undefined') {
            const starPointDefinition = definitions["STAR_RATING"] || { key: "STAR_RATING" };
            const starOpenDialog = () => {
                const dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(starPointDefinition, starRating, pageLocale);
                PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, pageLocale);
            };
            stars.appendChild(PointInfoDialog.createResultInfoIcon(pageLocale, starOpenDialog));
        }

        measurementInfo.appendChild(stars);
    }

    sections.forEach(section => {
        const titleEl = document.createElement('h2');
        titleEl.textContent = localize(section.titleLocalizationKey, pageLocale);
        container.appendChild(titleEl);
        let numberOfChildren = 0;

        for (let i = 0; i < section.pointsIDs.length; i++) {
            const pointID = section.pointsIDs[i];
            const nextPointID = section.pointsIDs[i + 1];
            // Special handling for BP_SYSTOLIC and BP_DIASTOLIC combination
            if (pointID === "BP_SYSTOLIC" && nextPointID === "BP_DIASTOLIC") {
                renderBloodPressureRow(results, definitions, container, pageLocale);
                i++; // Skip the next ID since it's already processed
                numberOfChildren += 1;
                continue;
            }

            let result = results[pointID];

            if (pointID === "TEMPERATURE_SENSOR" && (isNaN(result) || result === 0)) {
                // Fallback to BODY_TEMPERATURE if TEMPERATURE_SENSOR is not available
                console.log("Falling back to BODY_TEMPERATURE for temperature reading.");
                result = results["BODY_TEMPERATURE"];
            }

            const pointDefinition = definitions[pointID];
            if (!pointDefinition) continue;

            // Skip rendering if result is not available and point is configured to hide when missing
            if (pointDefinition.hideWhenMissing && (result === undefined || isNaN(result))) {
                continue;
            }

            renderResultRow(result, definitions[pointID], container, pageLocale);

            numberOfChildren += 1;
        }

        if (numberOfChildren === 0) {
            container.removeChild(titleEl);
        }
    });
}

/**
 * Builds a single result HTMLElement.
 * @param {Object} result - The result object containing the key and value.
 * @param {Object} pointDefinition - The point definition object for the result.
 * @returns {HTMLElement} The constructed result element.
 */
function renderResultRow(result, pointDefinition, container, locale) {
    const colorClass = getColorClass(result, pointDefinition);
    const formattedValue = formatResultValue(result, pointDefinition.decimalPlaces, pointDefinition.units, locale);

    const resultEl = document.createElement('div');
    resultEl.className = 'result';
    resultEl.dataset.pointKey = pointDefinition.key;

    const iconEl = document.createElement('div');
    iconEl.className = 'result-icon';
    loadSVGIcon(iconEl, pointDefinition.key);

    const nameLabel = document.createElement('span');
    nameLabel.className = "result-name";
    nameLabel.textContent = localize(`DFXPOINT_TITLE:${pointDefinition.key}`, locale);

    const valueEl = document.createElement('span');
    valueEl.className = `result-value ${colorClass}`;
    valueEl.textContent = formattedValue;

    const unitEl = document.createElement('span');
    if (pointDefinition.units !== "" && pointDefinition.units !== "PERCENT") {
        unitEl.className = 'result-unit';
        unitEl.textContent = localize(`DFXPOINT_UNIT:${pointDefinition.units}`, locale);
    }

    resultEl.appendChild(iconEl);

    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'result-name-wrapper';
    nameWrapper.appendChild(nameLabel);

    if (typeof PointInfoDialog !== 'undefined' && shouldShowInfoIcon(pointDefinition.key)) {
        const openDialog = () => {
            const dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(pointDefinition, result, locale);
            PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, locale);
        };
        nameWrapper.appendChild(PointInfoDialog.createResultInfoIcon(locale, openDialog));
    }
    resultEl.appendChild(nameWrapper);

    resultEl.appendChild(valueEl);
    resultEl.appendChild(unitEl);

    container.appendChild(resultEl);

    return resultEl;
}

/**
 * Returns whether an info icon should be shown for a given point key.
 * @param {string} pointKey
 * @returns {boolean}
 */
function shouldShowInfoIcon(pointKey) {
    return pointKey !== 'AGE' &&
           pointKey !== 'VITAL_SCORE' && pointKey !== 'PHYSIO_SCORE' &&
           pointKey !== 'MENTAL_SCORE' && pointKey !== 'PHYSICAL_SCORE' &&
           pointKey !== 'RISKS_SCORE';
}

/**
 * Renders a special row for blood pressure results.
 * @param {Object} results - A dictionary containing measurement results.
 * @param {Object} definitions - An object containing point definitions.
 * @param {HTMLElement} container - The container to append the blood pressure row to.
 */
function renderBloodPressureRow(results, definitions, container, locale) {
    const systolicResult = results["BP_SYSTOLIC"];
    const diastolicResult = results["BP_DIASTOLIC"];
    const systolicDefinition = definitions["BP_SYSTOLIC"];
    const diastolicDefinition = definitions["BP_DIASTOLIC"];

    const resultEl = document.createElement('div');
    resultEl.className = 'result';
    resultEl.dataset.pointKey = 'BP';

    const iconEl = document.createElement('div');
    iconEl.className = 'result-icon';
    loadSVGIcon(iconEl, 'BP');

    const nameLabel = document.createElement('span');
    nameLabel.className = "result-name";
    nameLabel.textContent = localize("DFXPOINT_TITLE:BP", locale);

    const bloodPressureValueEl = document.createElement('span');
    bloodPressureValueEl.className = 'result-value';

    const systolicValueEl = document.createElement('span');
    systolicValueEl.className = getColorClass(systolicResult, systolicDefinition);
    systolicValueEl.textContent = formatResultValue(systolicResult, systolicDefinition.decimalPlaces, systolicDefinition.units, locale);

    const separatorValueEl = document.createElement('span');
    separatorValueEl.className = 'grey';
    separatorValueEl.textContent = "\xa0/\xa0";

    const diastolicValueEl = document.createElement('span');
    diastolicValueEl.className = getColorClass(diastolicResult, diastolicDefinition);
    diastolicValueEl.textContent = formatResultValue(diastolicResult, diastolicDefinition.decimalPlaces, diastolicDefinition.units, locale);

    bloodPressureValueEl.appendChild(systolicValueEl);
    bloodPressureValueEl.appendChild(separatorValueEl);
    bloodPressureValueEl.appendChild(diastolicValueEl);

    const unitEl = document.createElement('span');
    unitEl.className = 'result-unit';
    unitEl.textContent = localize("DFXPOINT_UNIT:MMHG", locale);

    resultEl.appendChild(iconEl);

    const nameWrapper = document.createElement('div');
    nameWrapper.className = 'result-name-wrapper';
    nameWrapper.appendChild(nameLabel);

    if (typeof PointInfoDialog !== 'undefined') {
        const openDialog = () => {
            const dialogOptions = PointInfoDialog.buildBloodPressureInfoDialogOptions(
                systolicDefinition, systolicResult,
                diastolicDefinition, diastolicResult,
                locale
            );
            PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, locale);
        };
        nameWrapper.appendChild(PointInfoDialog.createResultInfoIcon(locale, openDialog));
    }
    resultEl.appendChild(nameWrapper);

    resultEl.appendChild(bloodPressureValueEl);
    resultEl.appendChild(unitEl);

    container.appendChild(resultEl);
}

/**
 * Determines the color class for a given value based on its definition scales.
 * @param {number} value - The value to determine the color class for.
 * @param {Object} pointDefinition - The definition of the point including scale segments.
 * @returns {string} The color class for the given value.
 */
function getColorClass(value, pointDefinition) {
    let colorClass = 'grey';
    const decimalPlaces = pointDefinition.decimalPlaces;
    const roundedValue = roundToDecimalPlaces(value, decimalPlaces);
    const segments = pointDefinition.scales?.default?.segments;
    if (segments) {
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (roundedValue >= segment.min && roundedValue < segment.max) {
                colorClass = segment.color;
                break;
            }

            // Special case for the last segment, if the value is equal to the max of the last segment
            if (i === segments.length - 1 && roundedValue === segment.max) {
                colorClass = segment.color;
                break;
            }
        }
    }

    return colorClass;
}

/**
 * Formats a numerical value to a specified number of decimal places.
 * @param {number} value - The value to format.
 * @param {number} decimalPlaces - The number of decimal places to format the value to.
 * @param {string} units - The units of the formatted value.
 * @param {string} locale - The locale code to be used for formatting
 * @returns {string} The formatted value as a string.
 */
function formatResultValue(value, decimalPlaces, units, locale) {
    const isPercentageUnit = units === "PERCENT";
    const roundedValue = roundToDecimalPlaces(value, decimalPlaces);
    const convertedValue = isPercentageUnit ? roundedValue / 100 : roundedValue;
    const options = { 
        maximumFractionDigits: decimalPlaces, 
        minimumFractionDigits: decimalPlaces, 
        style: (isPercentageUnit ? "percent" : "decimal") 
    };
    if (isNaN(convertedValue)) {
        return "?";
    } else {
        return new Intl.NumberFormat(locale, options).format(convertedValue);
    }
}

/**
 * Localizes a given key using the default language setting.
 * @param {string} key - The localization key to translate.
 * @param {string} locale - The locale code to be used for looking up the localized string
 * @returns {string} The localized string or the key if not found.
 */
function localize(key, locale) {
    return getLocalizedValue(key, locale) ?? key;
}

function getLocalizedValue(key, locale) {
    const entry = DeepAffexWebResultsData.translations[key];
    if (!entry) return null;
    return entry[locale] ?? entry.default ?? null;
}

/**
 * Gets the current browser locale.
 * @returns {string} The current browser locale.
 */
function getLocale() {
    return localStorage.getItem('selectedLanguage')
        || ((navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language);
}

/**
 * Rounds a number to a specified number of decimal places.
 * @param {number} value - The value to round.
 * @param {number} decimalPlaces - The number of decimal places to round to.
 * @returns {number} The rounded value.
 */
function roundToDecimalPlaces(value, decimalPlaces) {
    if (isNaN(value)) {
        return value;
    }
    return Number(Math.round(value+'e'+decimalPlaces)+'e-'+decimalPlaces);
}

/**
 * Loads SVG icon from inline data.
 * @param {HTMLElement} iconElement - The icon element to populate with icon content.
 * @param {string} iconName - The name of the icon to load.
 */
function loadSVGIcon(iconElement, iconName) {
    // Check if SVGIcons is available (from svg-icons.js)
    if (typeof SVGIcons !== 'undefined' && SVGIcons[iconName]) {
        iconElement.innerHTML = SVGIcons[iconName];
    } else {
        // Fallback icon mapping
        const iconMap = {
            'HR_BPM': '❤️',
            'IHB_COUNT': '💓',
            'BR_BPM': '🫁',
            'BP_SYSTOLIC': '🩸',
            'BP_DIASTOLIC': '🩸',
            'BP': '🩸',
            'TEMPERATURE_SENSOR': '🌡️',
            'HRV_SDNN': '📊',
            'BP_RPP': '⚡',
            'BP_TAU': '🔄',
            'MSI': '🧠',
            'BMI_CALC': '⚖️',
            'AGE': '👤',
            'WAIST_TO_HEIGHT': '📏',
            'ABSI': '📐',
            'HEIGHT': '📏',
            'WEIGHT': '⚖️',
            'WAIST_CIRCUM': '📏',
            'BP_CVD': '💔',
            'BP_HEART_ATTACK': '🫀',
            'BP_STROKE': '🧠',
            'HPT_RISK_PROB': '⚠️',
            'DBT_RISK_PROB': '⚠️',
            'HDLTC_RISK_PROB': '⚠️',
            'TG_RISK_PROB': '⚠️',
            'FLD_RISK_PROB': '⚠️',
            'OVERALL_METABOLIC_RISK_PROB': '⚠️',
            'HBA1C_RISK_PROB': '🩸',
            'MFBG_RISK_PROB': '🩸',
            'HEALTH_SCORE': '✨',
            'VITAL_SCORE': '💪',
            'PHYSIO_SCORE': '🏃',
            'MENTAL_SCORE': '😊',
            'PHYSICAL_SCORE': '🏋️',
            'RISKS_SCORE': '🛡️'
        };
        
        const icon = iconMap[iconName] || '●';
        iconElement.innerHTML = icon;
        iconElement.style.fontSize = '20px';
    }
    
    iconElement.style.display = 'flex';
    iconElement.style.alignItems = 'center';
    iconElement.style.justifyContent = 'center';
}

/**
 * Renders the disclaimer into #disclaimer-container.
 * @param {string} lang - The language code.
 */
function renderDisclaimer(lang) {
    const container = document.getElementById('disclaimer-container');
    if (!container) return;
    const p = document.createElement('p');
    p.className = 'footer-disclaimer';

    const icon = document.createElement('img');
    icon.src = 'assets/imgs/warning32.png';
    icon.alt = 'Warning';
    icon.style.cssText = 'width:18px;height:18px;margin-right:5px;vertical-align:middle;display:inline-block;';

    const text = document.createTextNode(localize('RESULTS_DISCLAIMER', lang));
    p.appendChild(icon);
    p.appendChild(text);
    container.appendChild(p);
}