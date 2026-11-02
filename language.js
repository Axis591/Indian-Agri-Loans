/* AgriBridge multilingual page translation.
   Auto mode uses approximate IP-region detection and then browser-language fallback.
   It never asks for GPS or precise device location. Translation is machine generated.
*/
(() => {
  'use strict';

  const selector = document.getElementById('language-select');
  const status = document.getElementById('language-status');
  const supported = ['en','hi','bn','gu','mr','ta','te','kn','ml','pa','ur','ne','sd'];
  const modeKey = 'agriBridgeLanguageMode_v1';
  const autoCacheKey = 'agriBridgeAutoLanguage_v1';
  const cacheMaxAge = 7 * 24 * 60 * 60 * 1000;
  let activeLanguage = 'en';
  let refreshTimer = null;

  const stateCodeLanguage = {
    WB:'bn', TR:'bn', MH:'mr', GA:'mr', GJ:'gu', TN:'ta', PY:'ta',
    AP:'te', TS:'te', KA:'kn', KL:'ml', PB:'pa', CH:'pa',
    JK:'ur', LA:'ur', SK:'ne',
    OD:'hi', OR:'hi', AS:'hi', BR:'hi', UP:'hi', MP:'hi', RJ:'hi',
    HR:'hi', DL:'hi', UK:'hi', CG:'hi', JH:'hi', HP:'hi'
  };
  const stateNameLanguage = {
    'west bengal':'bn', 'tripura':'bn',
    'maharashtra':'mr', 'goa':'mr', 'gujarat':'gu',
    'tamil nadu':'ta', 'puducherry':'ta',
    'andhra pradesh':'te', 'telangana':'te',
    'karnataka':'kn', 'kerala':'ml',
    'punjab':'pa', 'chandigarh':'pa',
    'jammu and kashmir':'ur', 'ladakh':'ur',
    'sikkim':'ne', 'odisha':'hi', 'orissa':'hi', 'assam':'hi',
    'bihar':'hi', 'uttar pradesh':'hi', 'madhya pradesh':'hi',
    'rajasthan':'hi', 'haryana':'hi', 'delhi':'hi', 'nct of delhi':'hi',
    'uttarakhand':'hi', 'chhattisgarh':'hi', 'jharkhand':'hi', 'himachal pradesh':'hi'
  };
  const languageNames = {
    en:'English', hi:'Hindi', bn:'Bengali', gu:'Gujarati', mr:'Marathi',
    ta:'Tamil', te:'Telugu', kn:'Kannada', ml:'Malayalam', pa:'Punjabi',
    ur:'Urdu', ne:'Nepali', sd:'Sindhi'
  };

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeSet(key,value) {
    try { localStorage.setItem(key,value); } catch (_) { /* storage may be disabled */ }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (_) { /* storage may be disabled */ }
  }
  function normalise(value) {
    return String(value || '').toLowerCase().replace(/&/g,'and').replace(/[^a-z\s]/g,' ').replace(/\s+/g,' ').trim();
  }
  function browserLanguage() {
    const choices = Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages : [navigator.language || ''];
    for (const choice of choices) {
      const code = String(choice).toLowerCase().split('-')[0];
      if (supported.includes(code) && code !== 'en') return code;
    }
    return 'en';
  }
  function cachedAutomatic() {
    try {
      const saved = JSON.parse(safeGet(autoCacheKey) || 'null');
      if (saved && supported.includes(saved.language) && Date.now() - saved.savedAt < cacheMaxAge) return saved;
    } catch (_) { /* ignore malformed cache */ }
    return null;
  }
  async function detectRegionLanguage() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2400);
    try {
      const response = await fetch('https://ipapi.co/json/', {
        method:'GET', cache:'no-store', signal:controller.signal, referrerPolicy:'no-referrer'
      });
      if (!response.ok) throw new Error('Region lookup unavailable');
      const place = await response.json();
      if (String(place.country_code || '').toUpperCase() !== 'IN') return {language:'en',region:''};
      const code = String(place.region_code || '').toUpperCase().split('-').pop();
      const region = String(place.region || '').trim();
      return {language:stateCodeLanguage[code] || stateNameLanguage[normalise(region)] || 'hi',region};
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function resolveAutomaticLanguage() {
    const saved = cachedAutomatic();
    if (saved) return {language:saved.language,source:saved.source || 'region',region:saved.region || ''};
    const regionResult = await detectRegionLanguage();
    if (regionResult && regionResult.region) {
      const result = {...regionResult,source:'region'};
      safeSet(autoCacheKey,JSON.stringify({...result,savedAt:Date.now()}));
      return result;
    }
    const result = {language:browserLanguage(),source:'browser',region:''};
    safeSet(autoCacheKey,JSON.stringify({...result,savedAt:Date.now()}));
    return result;
  }
  function setDocumentLanguage(code) {
    document.documentElement.lang = code === 'en' ? 'en' : code + '-IN';
    document.documentElement.dir = code === 'ur' ? 'rtl' : 'ltr';
  }
  function setStatus(code,source,region) {
    if (!status) return;
    const name = languageNames[code] || 'English';
    status.textContent = source === 'region' && region
      ? 'Auto · ' + name + ' (' + region + ')'
      : source === 'browser' ? 'Auto · ' + name
      : 'Selected · ' + name;
  }
  function loadTranslationEngine() {
    window.gtranslateSettings = {
      default_language:'en',
      languages:supported,
      native_language_names:true,
      detect_browser_language:false,
      wrapper_selector:'#gtranslate_engine',
      switcher_horizontal_position:'inline',
      switcher_open_direction:'bottom',
      switcher_text_color:'#294536',
      switcher_arrow_color:'#294536',
      switcher_border_color:'#dfe6dc',
      switcher_background_color:'#ffffff',
      switcher_background_hover_color:'#f7f8f4',
      dropdown_text_color:'#294536',
      dropdown_hover_color:'#e9f0e7',
      dropdown_background_color:'#ffffff'
    };
    const script = document.createElement('script');
    script.src = 'https://cdn.gtranslate.net/widgets/latest/dropdown.js';
    script.async = true;
    script.defer = true;
    script.onload = () => setTimeout(applyTranslation,900);
    script.onerror = () => {
      if (status) status.textContent = 'Translation service unavailable · English shown';
    };
    document.head.appendChild(script);
  }
  function applyTranslation(attempt = 0) {
    const pair = 'en|' + activeLanguage;
    const widgetSelect = document.querySelector('#gtranslate_engine select, .gtranslate_wrapper select, select.gt_selector');
    if (widgetSelect) {
      const option = Array.from(widgetSelect.options || []).find(item => item.value === pair || item.value === activeLanguage);
      if (option) {
        widgetSelect.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));
        widgetSelect.value = option.value;
        widgetSelect.dispatchEvent(new Event('change',{bubbles:true}));
        return;
      }
    }
    if (typeof window.doGTranslate === 'function') {
      window.doGTranslate(pair);
      return;
    }
    if (attempt < 30) setTimeout(() => applyTranslation(attempt + 1),350);
  }
  window.refreshAgriTranslation = function() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => applyTranslation(),500);
  };

  async function initialise() {
    const savedMode = safeGet(modeKey);
    let result,source;
    if (savedMode && supported.includes(savedMode)) {
      result = {language:savedMode,region:''};
      source = 'selected';
    } else {
      result = await resolveAutomaticLanguage();
      source = result.source || 'browser';
    }
    activeLanguage = result.language || 'en';
    if (selector) selector.value = savedMode && supported.includes(savedMode) ? savedMode : 'auto';
    setDocumentLanguage(activeLanguage);
    setStatus(activeLanguage,source,result.region || '');
    loadTranslationEngine();
  }

  if (selector) {
    selector.addEventListener('change',async() => {
      const choice = selector.value;
      if (choice === 'auto') {
        safeRemove(modeKey);
        safeRemove(autoCacheKey);
      } else if (supported.includes(choice)) {
        safeSet(modeKey,choice);
      } else return;

      selector.disabled = true;
      if (status) status.textContent = choice === 'auto' ? 'Detecting your region…' : 'Switching to ' + languageNames[choice] + '…';
      let result = null;
      if (choice === 'auto') {
        result = await resolveAutomaticLanguage();
        activeLanguage = result.language || 'en';
        setDocumentLanguage(activeLanguage);
      } else {
        activeLanguage = choice;
        setDocumentLanguage(choice);
      }
      setStatus(activeLanguage,choice === 'auto' ? (result.source || 'browser') : 'selected',choice === 'auto' ? result.region || '' : '');
      applyTranslation();
      selector.disabled = false;
    });
  }

  initialise();
})();
