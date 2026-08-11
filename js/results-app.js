function renderResults(results, definitions, sections, pageLocale) {
    let container = document.getElementById('results-container')
    let measurementInfo = document.getElementById("measurementInfo")


    let snr = getPointResult("SNR", results)
    if (snr && !isNaN(snr)) {
        let snrInfo = document.createElement('span')
        let snrPointDefinition = definitions["SNR"] || { key: "SNR" }
        let snrDisplayValue = formatResultValue(snr, snrPointDefinition.decimalPlaces, snrPointDefinition.units, pageLocale)
        snrInfo.id = "snrContainer"
        snrInfo.textContent = `SNR: ${snrDisplayValue} dB`

        let snrOpenDialog = () => {
            let dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(snrPointDefinition, snr, pageLocale)
            PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, pageLocale)
        }
        snrInfo.appendChild(PointInfoDialog.createResultInfoIcon(pageLocale, snrOpenDialog))
        measurementInfo.append(snrInfo)
    }

    let starRating = getPointResult("STAR_RATING", results)
    if (starRating != null && !isNaN(starRating)) {
        let stars = document.createElement('span')
        stars.id = "starsContainer"
        for (let i = 1; i <= 5; i++) {
            let star = document.createElement('div')
            star.className = i <= starRating ? "star greenBackground" : "star greyBackground"
            stars.append(star)
        }

        let starPointDefinition = definitions["STAR_RATING"] || { key: "STAR_RATING" }
        let starOpenDialog = () => {
            let dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(starPointDefinition, starRating, pageLocale)
            PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, pageLocale)
        }
        stars.appendChild(PointInfoDialog.createResultInfoIcon(pageLocale, starOpenDialog))
        measurementInfo.appendChild(stars)
    }

    const stickyHeader = document.createElement('div')
    stickyHeader.className = 'sticky-top-cards'
    container.appendChild(stickyHeader)

    const healthScoreDef = definitions['HEALTH_SCORE']
    const healthScoreVal = getPointResult('HEALTH_SCORE', results)
    if (healthScoreDef) {
        renderWellnessDialCard(healthScoreVal, healthScoreDef, stickyHeader, pageLocale)
    }

    const infoBar = document.createElement('div')
    infoBar.className = 'info-bar'
    infoBar.appendChild(measurementInfo)
    stickyHeader.appendChild(infoBar)

    sections.forEach(section => {
        let titleEl = document.createElement('h2');
        titleEl.textContent = localize(section.titleLocalizationKey, pageLocale);
        container.appendChild(titleEl);
        var numberOfChildren = 0

        for (let i = 0; i < section.pointsIDs.length; i++) {
            let pointID = section.pointsIDs[i];
            let nextPointID = section.pointsIDs[i + 1];

            if (APP_CONFIG.excludePoints?.includes(pointID)) continue;

            if (pointID === "BP_CVD" && section.titleLocalizationKey === "SCREEN_RESULTS_SUBTITLE_GENERALRISKS" && hasMultiYearRiskResult(results, definitions)) {
                continue
            }

            if (pointID === "CVD_MULTI_YEAR_RISK_PROBS") {
                let pointDefinition = definitions[pointID]
                if (pointDefinition && renderMultiYearRiskRow(results, pointDefinition, container, pageLocale)) {
                    numberOfChildren += 1
                }
                continue
            }

            let result = getPointResult(pointID, results);

            if (pointID === "TEMPERATURE_SENSOR" && (isNaN(result) || result === 0)) {
                result = getPointResult("BODY_TEMPERATURE", results);
            }

            let pointDefinition = definitions[pointID]
            if (!pointDefinition) continue;

            let dialogDefinitionOverride = null
            if (pointID === "BP_CVD" && section.titleLocalizationKey === "SCREEN_RESULTS_SUBTITLE_OVERALL" && hasMultiYearRiskResult(results, definitions)) {
                const multiYearDef = definitions["CVD_MULTI_YEAR_RISK_PROBS"]
                const values = getMultiYearRiskValues(results, multiYearDef)
                const firstAvailableIndex = values.findIndex(hasPointResultValue)
                if (firstAvailableIndex !== -1) {
                    const selectedIndex = values.length > 1 ? Math.min(9, values.length - 1) : firstAvailableIndex
                    result = values[selectedIndex]
                }
            }

            if (Number.isFinite(result) && pointDefinition.multiplier) {
                result = result * pointDefinition.multiplier
            }

            if (pointDefinition.hideWhenMissing && (result === undefined || isNaN(result))) {
                continue;
            }

            let titleKeyOverride = section.pointTitleOverrides?.[pointID] ?? null;
            let iconKeyOverride = section.pointIconOverrides?.[pointID] ?? null;

            const isTempPoint = pointID === "TEMPERATURE_SENSOR" || pointID === "BODY_TEMPERATURE";
            let defForRow = definitions[pointID];
            if (isTempPoint && Number.isFinite(result)) {
                const fahrenheit = parseFloat(((result * 9 / 5) + 32).toFixed(1));
                defForRow = Object.assign({}, definitions[pointID], {
                    _tempCelsius: result,
                    _tempFahrenheit: fahrenheit,
                });
            }

            renderResultRow(result, defForRow, container, pageLocale, titleKeyOverride, dialogDefinitionOverride, iconKeyOverride);
            numberOfChildren += 1;
        }

        if (numberOfChildren == 0) {
            container.removeChild(titleEl)
        }
    })
}

// Webapp receives results with plain string keys (not hashes)
function getPointResult(pointID, results) {
    return results[pointID]
}

function getRawPointResult(pointID, results) {
    return results[pointID]
}

function getPointResults(pointID, results) {
    let count = getRawPointResult(`${pointID}_COUNT`, results)
    if (Number.isFinite(count)) {
        let resultCount = Math.max(0, Math.trunc(count))
        return Array.from({ length: resultCount }, (_, index) => getRawPointResult(`${pointID}_${index}`, results))
    }
    return [getRawPointResult(pointID, results)]
}

function hasPointResultValue(value) {
    return Number.isFinite(value)
}

function hasMultiYearRiskResult(results, definitions) {
    let pointDefinition = definitions["CVD_MULTI_YEAR_RISK_PROBS"]
    return Boolean(pointDefinition && getMultiYearRiskValues(results, pointDefinition).some(hasPointResultValue))
}

function getMultiYearRiskValues(results, pointDefinition) {
    let values = getPointResults(pointDefinition.key, results)
    if (values.length === 1 && !hasPointResultValue(values[0])) {
        values = Array.from({ length: 20 }, (_, index) => {
            return getRawPointResult(`${pointDefinition.key}_${index + 1}`, results)
        })
    }
    return values
}

function renderMultiYearRiskRow(results, pointDefinition, container, locale) {
    let values = getMultiYearRiskValues(results, pointDefinition)

    const firstAvailableIndex = values.findIndex(hasPointResultValue)
    if (firstAvailableIndex === -1) return false

    let selectedIndex = values.length > 1 ? Math.min(9, values.length - 1) : firstAvailableIndex
    let selectedYear = selectedIndex + 1
    let selectedValue = values[selectedIndex]

    let resultEl = document.createElement('div')
    resultEl.className = 'result multi-year-result'
    resultEl.dataset.pointKey = pointDefinition.key

    let mainRow = document.createElement('div')
    mainRow.className = 'multi-year-main-row'

    let iconEl = document.createElement('div')
    iconEl.className = 'result-icon'
    loadSVGIcon(iconEl, pointDefinition.iconKey || pointDefinition.key)
    mainRow.appendChild(iconEl)

    let nameWrapper = document.createElement('div')
    nameWrapper.className = 'result-name-wrapper'
    let nameLabel = document.createElement('span')
    nameLabel.className = 'result-name'
    nameLabel.textContent = localize(`DFXPOINT_TITLE:${pointDefinition.key}`, locale)
    nameWrapper.appendChild(nameLabel)

    let openDialog = () => {
        let dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(pointDefinition, selectedValue, locale)
        PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, locale)
    }
    nameWrapper.appendChild(PointInfoDialog.createResultInfoIcon(locale, openDialog))
    mainRow.appendChild(nameWrapper)

    let valueEl = document.createElement('span')
    valueEl.className = 'result-value'
    mainRow.appendChild(valueEl)
    resultEl.appendChild(mainRow)

    let gaugeBar = createInlineGaugeBar(selectedValue, pointDefinition)
    if (gaugeBar) resultEl.appendChild(gaugeBar.el)

    let yearLabel
    let slider
    if (values.length > 1) {
        yearLabel = document.createElement('div')
        yearLabel.className = 'multi-year-selected-label'
        resultEl.appendChild(yearLabel)

        let sliderRow = document.createElement('div')
        sliderRow.className = 'multi-year-slider-row'

        let minLabel = document.createElement('span')
        minLabel.textContent = '1'
        minLabel.setAttribute('aria-hidden', 'true')
        sliderRow.appendChild(minLabel)

        slider = document.createElement('input')
        slider.className = 'multi-year-slider'
        slider.type = 'range'
        slider.min = '1'
        slider.max = String(values.length)
        slider.step = '1'
        slider.value = String(selectedYear)
        slider.setAttribute('aria-label', localize('DFXPOINT_CVD_YEAR_SLIDER_LABEL', locale))

        let tickList = document.createElement('datalist')
        tickList.id = 'cvd-risk-year-ticks'
        for (let year = 1; year <= values.length; year++) {
            let tick = document.createElement('option')
            tick.value = String(year)
            tickList.appendChild(tick)
        }
        slider.setAttribute('list', tickList.id)
        sliderRow.appendChild(slider)
        sliderRow.appendChild(tickList)

        let maxLabel = document.createElement('span')
        maxLabel.textContent = String(values.length)
        maxLabel.setAttribute('aria-hidden', 'true')
        sliderRow.appendChild(maxLabel)
        resultEl.appendChild(sliderRow)
    }

    function updateSliderFill(sl) {
        const pct = (sl.value - sl.min) / (sl.max - sl.min) * 100
        sl.style.setProperty('--slider-fill', pct + '%')
    }

    const colorClasses = ['green', 'lightGreen', 'yellow', 'lightRed', 'red', 'grey']
    const updateSelectedYear = year => {
        selectedYear = year
        selectedValue = values[year - 1]
        valueEl.classList.remove(...colorClasses)
        valueEl.textContent = formatResultValue(selectedValue, pointDefinition.decimalPlaces, pointDefinition.units, locale)
        if (gaugeBar) gaugeBar.updateValue(selectedValue)
        let yearTemplate = localize('DFXPOINT_CVD_YEAR_LABEL', locale)
        if (yearLabel) yearLabel.textContent = yearTemplate.replace('{year}', year)
        if (slider) {
            slider.setAttribute('aria-valuetext', yearLabel ? yearLabel.textContent : '')
            updateSliderFill(slider)
        }
    }

    if (slider) {
        slider.addEventListener('input', event => updateSelectedYear(Number(event.target.value)))
        slider.addEventListener('click', event => event.stopPropagation())
    }
    resultEl.style.cursor = 'pointer'
    resultEl.addEventListener('click', openDialog)
    updateSelectedYear(selectedYear)
    container.appendChild(resultEl)
    return true
}

function renderResultRow(result, pointDefinition, container, locale, titleKeyOverride = null, dialogDefinition = null, iconKeyOverride = null) {
    const displayResult = PERCENT_OF_MAX_POINTS.has(pointDefinition.key) && !isNaN(result)
        ? result / 5 * 100
        : result

    let colorClass = getColorClass(displayResult, pointDefinition);
    let formattedValue = (pointDefinition._tempCelsius !== undefined)
        ? `${pointDefinition._tempCelsius.toFixed(1)}°C (${pointDefinition._tempFahrenheit.toFixed(1)}°F)`
        : formatResultValue(displayResult, pointDefinition.decimalPlaces, pointDefinition.units, locale);
    let resultEl = document.createElement('div');
    resultEl.className = 'result';
    resultEl.dataset.pointKey = pointDefinition.key;

    let iconEl = document.createElement('div');
    iconEl.className = 'result-icon';
    loadSVGIcon(iconEl, iconKeyOverride ?? pointDefinition.key);

    let titleKey = titleKeyOverride ?? `DFXPOINT_TITLE:${pointDefinition.key}`;
    let nameLabel = document.createElement('span')
    nameLabel.className = "result-name"
    nameLabel.textContent = localize(titleKey, locale)

    let valueEl = document.createElement('span')
    valueEl.className = 'result-value'
    valueEl.textContent = formattedValue

    let unitEl = document.createElement('span')
    if (pointDefinition._tempCelsius === undefined && pointDefinition.units !== "" && pointDefinition.units !== "PERCENT") {
        unitEl.className = 'result-unit'
        unitEl.textContent = localize(`DFXPOINT_UNIT:${pointDefinition.units}`, locale)
    }

    resultEl.appendChild(iconEl)

    let nameWrapper = document.createElement('div')
    nameWrapper.className = 'result-name-wrapper'
    nameWrapper.appendChild(nameLabel)

    let openDialog = () => {
        let dialogOptions = PointInfoDialog.buildPointInfoDialogOptions(dialogDefinition ?? pointDefinition, displayResult, locale)
        PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, locale)
    }
    if (shouldShowInfoIcon(pointDefinition.key)) {
        nameWrapper.appendChild(PointInfoDialog.createResultInfoIcon(locale, openDialog))
        resultEl.style.cursor = 'pointer'
        resultEl.addEventListener('click', openDialog)
    }
    resultEl.appendChild(nameWrapper)

    resultEl.appendChild(valueEl)
    resultEl.appendChild(unitEl)

    let gaugeBar = createInlineGaugeBar(displayResult, pointDefinition)
    if (gaugeBar) resultEl.appendChild(gaugeBar.el)

    container.appendChild(resultEl)
    return resultEl
}

function renderBloodPressureRow(results, definitions, container, locale) {
    let systolicResult = results["BP_SYSTOLIC"];
    let diastolicResult = results["BP_DIASTOLIC"];
    let systolicDefinition = definitions["BP_SYSTOLIC"];
    let diastolicDefinition = definitions["BP_DIASTOLIC"];

    let resultEl = document.createElement('div');
    resultEl.className = 'result';
    resultEl.dataset.pointKey = 'BP';

    let iconEl = document.createElement('div');
    iconEl.className = 'result-icon';
    loadSVGIcon(iconEl, 'BP');

    let nameLabel = document.createElement('span');
    nameLabel.className = "result-name"
    nameLabel.textContent = localize("DFXPOINT_TITLE:BP", locale);

    let bloodPressureValueEl = document.createElement('span');
    bloodPressureValueEl.className = 'result-value';

    let systolicValueEl = document.createElement('span');
    systolicValueEl.className = getColorClass(systolicResult, systolicDefinition);
    systolicValueEl.textContent = formatResultValue(systolicResult, systolicDefinition.decimalPlaces, systolicDefinition.units, locale);

    let separatorValueEl = document.createElement('span');
    separatorValueEl.className = 'grey';
    separatorValueEl.textContent = "\xa0/\xa0";

    let diastolicValueEl = document.createElement('span');
    diastolicValueEl.className = getColorClass(diastolicResult, diastolicDefinition);
    diastolicValueEl.textContent = formatResultValue(diastolicResult, diastolicDefinition.decimalPlaces, diastolicDefinition.units, locale);

    bloodPressureValueEl.appendChild(systolicValueEl);
    bloodPressureValueEl.appendChild(separatorValueEl);
    bloodPressureValueEl.appendChild(diastolicValueEl);

    let unitEl = document.createElement('span');
    unitEl.className = 'result-unit';
    unitEl.textContent = localize("DFXPOINT_UNIT:MMHG", locale);

    resultEl.appendChild(iconEl);

    let nameWrapper = document.createElement('div')
    nameWrapper.className = 'result-name-wrapper'
    nameWrapper.appendChild(nameLabel)

    let openDialog = () => {
        let dialogOptions = PointInfoDialog.buildBloodPressureInfoDialogOptions(
            systolicDefinition, systolicResult, diastolicDefinition, diastolicResult, locale
        )
        PointInfoDialog.showPointInfoDialog(dialogOptions.title, dialogOptions.content, locale)
    }
    nameWrapper.appendChild(PointInfoDialog.createResultInfoIcon(locale, openDialog))
    resultEl.appendChild(nameWrapper)

    resultEl.style.cursor = 'pointer'
    resultEl.addEventListener('click', openDialog)
    resultEl.appendChild(bloodPressureValueEl);
    resultEl.appendChild(unitEl);
    container.appendChild(resultEl);
}

function getColorClass(value, pointDefinition) {
    let colorClass = 'grey';
    let decimalPlaces = pointDefinition.decimalPlaces;
    let roundedValue = roundToDecimalPlaces(value, decimalPlaces);
    let segments = pointDefinition.scales?.default?.segments;
    if (segments) {
        for (let i = 0; i < segments.length; i++) {
            let segment = segments[i];
            if (roundedValue >= segment.min && roundedValue < segment.max) {
                colorClass = segment.color;
                break;
            }
            if (i === segments.length - 1 && roundedValue === segment.max) {
                colorClass = segment.color;
                break;
            }
        }
    }
    return colorClass;
}

function formatResultValue(value, decimalPlaces, units, locale) {
    let isPercentageUnit = units == "PERCENT"
    let roundedValue = roundToDecimalPlaces(value, decimalPlaces);
    let convertedValue = isPercentageUnit ? roundedValue / 100 : roundedValue
    let options = {
        maximumFractionDigits: decimalPlaces,
        minimumFractionDigits: decimalPlaces,
        style: (isPercentageUnit ? "percent" : "decimal")
    }
    if (isNaN(convertedValue)) return "?"
    return new Intl.NumberFormat(locale, options).format(convertedValue)
}

function localize(key, locale) {
    return getLocalizedValue(key, locale) ?? key
}

function getLocalizedValue(key, locale) {
    let entry = DeepAffexWebResultsData.translations[key]
    if (!entry) return null
    return entry[locale] ?? entry.default ?? null
}

function getLocale() {
    return localStorage.getItem('selectedLanguage')
        || ((navigator.languages && navigator.languages.length) ? navigator.languages[0] : navigator.language);
}

function roundToDecimalPlaces(value, decimalPlaces) {
    if (isNaN(value)) return value;
    return Number(Math.round(value + 'e' + decimalPlaces) + 'e-' + decimalPlaces);
}

function loadSVGIcon(iconElement, iconName) {
    const iconAliases = { 'BP_SYSTOLIC': 'BP', 'BP_DIASTOLIC': 'BP' };
    const resolvedName = iconAliases[iconName] || iconName;
    const img = document.createElement('img');
    img.src = `assets/svg/${resolvedName}.svg`;
    img.style.cssText = 'width:100%;height:100%;filter:brightness(0) invert(1);';
    img.onerror = function () {
        iconElement.innerHTML = '●';
        iconElement.classList.add('fallback');
    };
    iconElement.innerHTML = '';
    iconElement.appendChild(img);
}

function shouldShowInfoIcon(pointKey) {
    return pointKey !== 'RISKS_SCORE' && pointKey !== 'HEALTH_SCORE';
}

// Raw values for these points are on a 1–5 scale; display as percent-of-max (value/5*100)
const PERCENT_OF_MAX_POINTS = new Set(['VITAL_SCORE', 'PHYSIO_SCORE', 'MENTAL_SCORE', 'PHYSICAL_SCORE'])

const GAUGE_BAR_SKIP_POINTS = new Set(['AGE', 'SNR'])

function calculateGaugePointerPct(value, boundaries) {
    let min = boundaries[0]
    let max = boundaries[boundaries.length - 1]
    let clampedValue = Math.min(Math.max(value, min), max)
    let totalSegments = boundaries.length - 1
    let ratio = 0
    for (let i = 0; i < totalSegments; i++) {
        let start = boundaries[i]
        let end = boundaries[i + 1]
        if (clampedValue >= end) { ratio = i + 1; continue }
        if (clampedValue >= start && clampedValue <= end) {
            let span = end - start
            ratio = i + (span > 0 ? (clampedValue - start) / span : 0)
            break
        }
    }
    return Math.min(Math.max((ratio / totalSegments) * 100, 0), 100)
}

function createInlineGaugeBar(result, pointDefinition) {
    if (GAUGE_BAR_SKIP_POINTS.has(pointDefinition.key)) return null
    if (typeof result !== 'number' || isNaN(result)) return null
    let segments = pointDefinition.scales?.default?.segments
    if (!segments || segments.length === 0) return null

    let boundaries = []
    let seen = new Set()
    segments.forEach(s => {
        if (typeof s.min === 'number' && !seen.has(s.min)) { seen.add(s.min); boundaries.push(s.min) }
        if (typeof s.max === 'number' && !seen.has(s.max)) { seen.add(s.max); boundaries.push(s.max) }
    })
    boundaries.sort((a, b) => a - b)
    if (boundaries.length < 2) return null

    let wrapper = document.createElement('div')
    wrapper.className = 'result-gauge-wrapper'

    let track = document.createElement('div')
    track.className = 'result-gauge-track'
    segments.forEach(segment => {
        let block = document.createElement('div')
        block.className = 'result-gauge-segment'
        block.style.backgroundColor = getSegmentColorValue(segment.color)
        track.appendChild(block)
    })

    let pointerWrapper = document.createElement('div')
    pointerWrapper.className = 'result-gauge-pointer-wrapper'

    let pointer = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    pointer.setAttribute('class', 'result-gauge-pointer')
    pointer.setAttribute('width', '18')
    pointer.setAttribute('height', '18')
    pointer.setAttribute('viewBox', '0 0 20 20')
    pointer.style.left = `${calculateGaugePointerPct(result, boundaries)}%`
    let whitePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    whitePath.setAttribute('d', 'M 10 3 L 2 17 L 18 17 Z')
    whitePath.setAttribute('fill', 'white')
    pointer.appendChild(whitePath)
    let strokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    strokePath.setAttribute('d', 'M 10 3 L 2 17 L 18 17 Z')
    strokePath.setAttribute('fill', 'none')
    strokePath.setAttribute('stroke', 'rgba(0,0,0,0.4)')
    strokePath.setAttribute('stroke-width', '3')
    strokePath.setAttribute('stroke-linejoin', 'round')
    pointer.appendChild(strokePath)
    pointerWrapper.appendChild(pointer)

    wrapper.appendChild(track)
    wrapper.appendChild(pointerWrapper)

    return {
        el: wrapper,
        updateValue: newResult => {
            pointer.style.left = `${calculateGaugePointerPct(newResult, boundaries)}%`
        }
    }
}

function getSegmentColorValue(colorKey) {
    const COLOR_MAP = {
        green: '#00de93',
        lightGreen: '#72e9b4',
        yellow: '#ffeb78',
        lightRed: '#ff8286',
        red: '#ff444f',
        grey: '#9E9E9E'
    }
    return COLOR_MAP[colorKey] ?? '#9E9E9E'
}

function renderWellnessDialCard(healthScoreValue, definition, container, locale) {
    const CX = 120, CY = 112, OR = 90, IR = 72
    const LB = definition.lowerBound ?? 0
    const UB = definition.upperBound ?? 100
    const segments = [...(definition.scales?.default?.segments ?? [])].sort((a, b) => a.min - b.min)

    function toAngle(v) {
        return 180 * (1 - (Math.min(UB, Math.max(LB, v)) - LB) / (UB - LB))
    }

    function polar(r, deg) {
        const rad = deg * Math.PI / 180
        return { x: CX + r * Math.cos(rad), y: CY - r * Math.sin(rad) }
    }

    function f(n) { return n.toFixed(2) }

    function segPath(r1, r2, sa, ea) {
        const o1 = polar(r1, sa), o2 = polar(r1, ea)
        const i2 = polar(r2, ea), i1 = polar(r2, sa)
        return `M${f(o1.x)},${f(o1.y)} A${r1},${r1} 0 0,1 ${f(o2.x)},${f(o2.y)} L${f(i2.x)},${f(i2.y)} A${r2},${r2} 0 0,0 ${f(i1.x)},${f(i1.y)} Z`
    }

    const GAP = 0.8
    const segPaths = segments.map((seg, i) => {
        const isFirst = i === 0, isLast = i === segments.length - 1
        const sa = toAngle(seg.min + (isFirst ? 0 : GAP))
        const ea = toAngle(seg.max - (isLast ? 0 : GAP))
        return `<path d="${segPath(OR, IR, sa, ea)}" fill="${getSegmentColorValue(seg.color)}"/>`
    }).join('')

    const val = (isNaN(healthScoreValue) || healthScoreValue === undefined) ? LB : healthScoreValue
    const needleAngle = toAngle(val)
    const tickOuter = polar(OR + 6, needleAngle)
    const tickInner = polar(IR - 6, needleAngle)
    const p20 = polar(IR - 12, toAngle(20))
    const p80 = polar(IR - 12, toAngle(80))
    const labelDrop = 2

    const pct = (isNaN(healthScoreValue) || healthScoreValue === undefined) ? '--' : `${Math.round(healthScoreValue)}%`
    const title = localize('DFXPOINT_TITLE:HEALTH_SCORE', locale)

    const svg = `<svg viewBox="0 0 240 140" xmlns="http://www.w3.org/2000/svg" aria-label="${title}: ${pct}">
      ${segPaths}
      <line x1="${f(tickInner.x)}" y1="${f(tickInner.y)}" x2="${f(tickOuter.x)}" y2="${f(tickOuter.y)}" stroke="white" stroke-width="3" stroke-linecap="round"/>
      <text x="${f(p20.x)}" y="${f(p20.y + labelDrop)}" fill="rgba(255,255,255,0.7)" font-size="10" text-anchor="middle">20</text>
      <text x="${f(p80.x)}" y="${f(p80.y + labelDrop)}" fill="rgba(255,255,255,0.7)" font-size="10" text-anchor="middle">80</text>
      <text x="${CX}" y="${CY - 10}" fill="white" font-size="28" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${pct}</text>
    </svg>`

    const card = document.createElement('div')
    card.className = 'wellness-dial-card'
    card.innerHTML = svg

    const labelEl = document.createElement('p')
    labelEl.className = 'wellness-dial-label'
    labelEl.textContent = title

    const infoOpenDialog = () => {
        const opts = PointInfoDialog.buildPointInfoDialogOptions(definition, val, locale)
        PointInfoDialog.showPointInfoDialog(opts.title, opts.content, locale)
    }
    labelEl.appendChild(PointInfoDialog.createResultInfoIcon(locale, infoOpenDialog))
    card.appendChild(labelEl)

    const streak = document.createElement('div')
    streak.className = 'wellness-dial-streak'
    card.appendChild(streak)

    container.appendChild(card)
}

function renderHeader(lang) {
    let header = document.getElementById('main-header');
    if (!header) return;
    let title = document.createElement('h1');
    title.textContent = localize("APP_NAME", lang);
    header.appendChild(title);
}

function renderDisclaimer(lang) {
    let container = document.getElementById('disclaimer-container');
    if (!container) return;

    let p = document.createElement('p');
    p.className = "footer-disclaimer";

    let icon = document.createElement('img');
    icon.src = 'assets/imgs/warning32.png';
    icon.alt = 'Warning';
    icon.style.cssText = 'width:18px;height:18px;margin-right:5px;vertical-align:middle;display:inline-block;';

    p.appendChild(icon);
    p.appendChild(document.createTextNode(localize("RESULTS_DISCLAIMER", lang)));
    container.appendChild(p);

    let aiText = localize("RESULTS_DISCLAIMER_AI", lang);
    if (aiText) {
        let pAi = document.createElement('p');
        pAi.className = "footer-disclaimer";
        pAi.textContent = aiText;
        container.appendChild(pAi);
    }
}
