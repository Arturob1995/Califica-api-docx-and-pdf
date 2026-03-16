// presentation-html-template.js
// Generates a complete static HTML document from presentation JSON,
// suitable for Puppeteer PDF rendering in landscape 16:9 format.

'use strict';

// ---------------------------------------------------------------------------
// Escape utility
// ---------------------------------------------------------------------------
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Font map
// ---------------------------------------------------------------------------
var FONTS = {
  nunito:    { heading: "'Nunito', sans-serif",    body: "'Nunito', sans-serif" },
  quicksand: { heading: "'Quicksand', sans-serif", body: "'Quicksand', sans-serif" },
  poppins:   { heading: "'Poppins', sans-serif",   body: "'Poppins', sans-serif" },
  baloo2:    { heading: "'Baloo 2', cursive",      body: "'Nunito', sans-serif" }
};

// ---------------------------------------------------------------------------
// SVG Pattern library
// ---------------------------------------------------------------------------
var PATTERNS = {
  puntos: function (color) { return '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="3" fill="' + color + '"/></svg>'; },
  ondas: function (color) { return '<svg width="80" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M0 20 Q20 0 40 20 Q60 40 80 20" fill="none" stroke="' + color + '" stroke-width="2"/></svg>'; },
  cuadricula: function (color) { return '<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg"><path d="M40 0H0v40" fill="none" stroke="' + color + '" stroke-width="1"/></svg>'; },
  estrellas: function (color) { return '<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><polygon points="30,5 35,22 52,22 38,33 43,50 30,40 17,50 22,33 8,22 25,22" fill="' + color + '"/></svg>'; },
  burbujas: function (color) { return '<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="10" fill="none" stroke="' + color + '" stroke-width="1.5"/><circle cx="60" cy="55" r="14" fill="none" stroke="' + color + '" stroke-width="1.5"/><circle cx="55" cy="15" r="5" fill="' + color + '" opacity="0.3"/></svg>'; },
  hojas: function (color) { return '<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><path d="M30 10 Q45 20 30 50 Q15 20 30 10Z" fill="none" stroke="' + color + '" stroke-width="1.5"/><line x1="30" y1="10" x2="30" y2="50" stroke="' + color + '" stroke-width="1" opacity="0.5"/></svg>'; },
  triangulos: function (color) { return '<svg width="60" height="52" xmlns="http://www.w3.org/2000/svg"><polygon points="30,4 56,48 4,48" fill="none" stroke="' + color + '" stroke-width="1.5"/></svg>'; },
  hexagonos: function (color) { return '<svg width="56" height="50" xmlns="http://www.w3.org/2000/svg"><polygon points="28,2 52,14 52,36 28,48 4,36 4,14" fill="none" stroke="' + color + '" stroke-width="1.5"/></svg>'; },
  zigzag: function (color) { return '<svg width="60" height="20" xmlns="http://www.w3.org/2000/svg"><polyline points="0,18 15,2 30,18 45,2 60,18" fill="none" stroke="' + color + '" stroke-width="2"/></svg>'; },
  circulos: function (color) { return '<svg width="60" height="60" xmlns="http://www.w3.org/2000/svg"><circle cx="30" cy="30" r="20" fill="none" stroke="' + color + '" stroke-width="1.5"/><circle cx="30" cy="30" r="8" fill="' + color + '" opacity="0.15"/></svg>'; }
};

// ---------------------------------------------------------------------------
// Pattern → CSS background-image data URI
// ---------------------------------------------------------------------------
function buildPatternCSS(patternName, color) {
  var svg = PATTERNS[patternName](color);
  var encoded = 'data:image/svg+xml,' + encodeURIComponent(svg);
  return "url(\"" + encoded + "\")";
}

// ---------------------------------------------------------------------------
// Slide counter badge
// ---------------------------------------------------------------------------
function counter(i, total) {
  return '<div class="slide-counter">' + (i + 1) + ' / ' + total + '</div>';
}

// ---------------------------------------------------------------------------
// Overlay system (background images, patterns, emojis)
// ---------------------------------------------------------------------------
function buildSlideOverlays(slide, config) {
  var html = '';

  // Background image
  if (slide.imagen_fondo && slide.imagen_fondo.url) {
    var op = slide.imagen_fondo.opacidad != null ? slide.imagen_fondo.opacidad : 0.15;
    html += '<div class="slide-bg-image" style="background-image:url(\'' + esc(slide.imagen_fondo.url) + '\');opacity:' + op + ';"></div>';
  }

  // Pattern overlay
  var pat = (config && config.patron) || null;
  if (pat && PATTERNS[pat]) {
    var accentColor = slide.color_acento || (config.colores_tema && config.colores_tema[0]) || '#000';
    var bgUrl = buildPatternCSS(pat, accentColor);
    html += '<div class="slide-pattern" style="background-image:' + bgUrl + ';background-repeat:repeat;"></div>';
  }

  // Floating emojis
  var emojis = (config && config.emojis_decorativos) || [];
  if (emojis.length > 0) {
    html += '<div class="slide-emojis">';
    var positions = [
      { top: '8%', left: '5%', size: 32 },
      { top: '15%', right: '8%', size: 26 },
      { top: '70%', left: '8%', size: 28 },
      { top: '75%', right: '6%', size: 24 },
      { top: '40%', right: '4%', size: 30 },
      { top: '5%', left: '45%', size: 22 },
      { top: '85%', left: '40%', size: 26 },
      { top: '50%', left: '3%', size: 20 }
    ];
    positions.forEach(function (pos, pi) {
      var emoji = emojis[pi % emojis.length];
      var style = 'font-size:' + pos.size + 'px;';
      if (pos.top) style += 'top:' + pos.top + ';';
      if (pos.left) style += 'left:' + pos.left + ';';
      if (pos.right) style += 'right:' + pos.right + ';';
      html += '<span class="slide-emoji" style="' + style + '">' + emoji + '</span>';
    });
    html += '</div>';
  }

  return html;
}

// ---------------------------------------------------------------------------
// Slide renderers
// ---------------------------------------------------------------------------

function renderTitulo(data, i, total, meta) {
  return '<div class="slide slide-titulo">' +
    '<div class="slide-inner">' +
      '<div class="materia-tag">' + esc(meta.materia) + '</div>' +
      '<div class="titulo-text">' + esc(data.titulo) + '</div>' +
      '<div class="titulo-divider"><div class="div-line"></div><div class="div-diamond"></div><div class="div-line"></div></div>' +
      '<div class="subtitulo-text">' + esc(data.subtitulo) + '</div>' +
    '</div>' +
    '<div class="footer-info">' +
      '<span>' + esc(meta.nombre_docente || '') + '</span>' +
      (meta.nombre_docente && meta.nombre_institucion ? '<span class="fi-dot"></span>' : '') +
      '<span>' + esc(meta.nombre_institucion || '') + '</span>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderTextoSimple(data, i, total) {
  return '<div class="slide slide-texto_simple">' +
    '<div class="edge-glow"></div>' +
    '<div class="slide-inner">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div class="slide-body">' + esc(data.cuerpo) + '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderTextoImagen(data, i, total) {
  var isLeft = data.layout === 'imagen_izquierda';
  var hasImg = data.imagen && data.imagen.url;
  var textHtml = '<div class="text-side">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div class="slide-body">' + esc(data.cuerpo) + '</div>' +
    '</div>';
  var imgHtml = '<div class="image-side">' +
    (hasImg
      ? '<img class="slide-image" src="' + esc(data.imagen.url) + '" alt="' + esc(data.imagen.alt || '') + '"/>'
      : '<div class="image-placeholder">' +
          '<div class="ph-label">Imagen</div>' +
          '<div class="ph-text">' + esc(data.imagen ? data.imagen.alt : 'Imagen de apoyo') + '</div>' +
        '</div>'
    ) +
  '</div>';
  return '<div class="slide slide-texto_imagen layout-' + (data.layout || 'imagen_derecha') + '">' +
    '<div class="slide-inner">' +
      (isLeft ? imgHtml + textHtml : textHtml + imgHtml) +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderNumeroGrande(data, i, total) {
  return '<div class="slide slide-numero_grande">' +
    '<div class="slide-inner">' +
      '<div class="big-number">' + esc(data.numero) + '</div>' +
      '<div class="big-desc">' + esc(data.descripcion) + '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderListaIconos(data, i, total) {
  var items = (data.items || []).map(function (item) {
    return '<div class="icon-item">' +
      '<div class="icon-circle">' + esc(item.icono) + '</div>' +
      '<div class="icon-content">' +
        '<div class="item-title">' + esc(item.titulo) + '</div>' +
        '<div class="item-desc">' + esc(item.descripcion) + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  return '<div class="slide slide-lista_iconos">' +
    '<div class="slide-inner">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div class="icon-list">' + items + '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderDosColumnas(data, i, total) {
  function renderCol(col, idx) {
    var icon = idx === 0 ? '\u00d7' : '\u00f7';
    var items = (col.items || []).map(function (it) { return '<div class="col-item">' + esc(it) + '</div>'; }).join('');
    return '<div class="column-card">' +
      '<div class="col-header">' +
        '<div class="col-icon">' + icon + '</div>' +
        '<div class="col-subtitle">' + esc(col.subtitulo) + '</div>' +
      '</div>' +
      '<div class="col-items">' + items + '</div>' +
    '</div>';
  }
  return '<div class="slide slide-dos_columnas">' +
    '<div class="slide-inner">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div class="columns-container">' +
        renderCol(data.columna_izq, 0) +
        renderCol(data.columna_der, 1) +
      '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderTabla(data, i, total) {
  var headers = (data.headers || []).map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('');
  var rows = (data.rows || []).map(function (row) {
    return '<tr>' + row.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<div class="slide slide-tabla">' +
    '<div class="slide-inner">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div><table><thead><tr>' + headers + '</tr></thead><tbody>' + rows + '</tbody></table></div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderPregunta(data, i, total) {
  return '<div class="slide slide-pregunta">' +
    '<div class="slide-inner">' +
      '<div class="question-circle">?</div>' +
      '<div class="question-text">' + esc(data.pregunta) + '</div>' +
      (data.pista ? '<div class="question-hint">' + esc(data.pista) + '</div>' : '') +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderActividad(data, i, total) {
  var pencilSVG = '<svg viewBox="0 0 24 24" fill="none"><path d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var ejercicios = (data.ejercicios || []).map(function (ej, idx) {
    return '<div class="ejercicio-card">' +
      '<div class="ej-num">' + (idx + 1) + '</div>' +
      '<span>' + esc(ej) + '</span>' +
    '</div>';
  }).join('');
  return '<div class="slide slide-actividad">' +
    '<div class="slide-inner">' +
      '<div class="act-header">' +
        '<div class="act-icon">' + pencilSVG + '</div>' +
        '<div class="slide-title">' + esc(data.titulo) + '</div>' +
      '</div>' +
      '<div class="instrucciones">' + esc(data.instrucciones) + '</div>' +
      '<div class="ejercicios-list">' + ejercicios + '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderSeparador(data, i, total) {
  return '<div class="slide slide-separador">' +
    '<div class="slide-inner">' +
      '<div class="sep-title">' + esc(data.titulo) + '</div>' +
      (data.subtitulo ? '<div class="sep-subtitle">' + esc(data.subtitulo) + '</div>' : '') +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderCierre(data, i, total) {
  return '<div class="slide slide-cierre">' +
    '<div class="slide-inner">' +
      '<div class="cierre-header">' +
        '<div class="cierre-star">\u2B50</div>' +
        '<div class="slide-title">' + esc(data.titulo) + '</div>' +
      '</div>' +
      '<div class="cierre-resumen">' + esc(data.resumen) + '</div>' +
      '<div class="tarea-card">' +
        '<div class="tarea-label">\uD83D\uDCDD TAREA</div>' +
        '<div class="tarea-text">' + esc(data.tarea) + '</div>' +
      '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

function renderListaBullets(data, i, total) {
  var items = (data.items || []).map(function (item) {
    return '<div class="bullet-item">' +
      '<div class="bullet-dot"></div>' +
      '<div>' + esc(item) + '</div>' +
    '</div>';
  }).join('');
  return '<div class="slide slide-lista_bullets">' +
    '<div class="slide-inner">' +
      '<div class="slide-title"><span class="title-accent">' + esc(data.titulo) + '</span></div>' +
      '<div class="bullet-list">' + items + '</div>' +
    '</div>' +
    counter(i, total) +
  '</div>';
}

// ---------------------------------------------------------------------------
// Renderer dispatch
// ---------------------------------------------------------------------------
var RENDERERS = {
  titulo:         renderTitulo,
  texto_simple:   renderTextoSimple,
  texto_imagen:   renderTextoImagen,
  numero_grande:  renderNumeroGrande,
  lista_iconos:   renderListaIconos,
  dos_columnas:   renderDosColumnas,
  tabla:          renderTabla,
  pregunta:       renderPregunta,
  actividad:      renderActividad,
  separador:      renderSeparador,
  cierre:         renderCierre,
  lista_bullets:  renderListaBullets
};

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------
function buildPresentationHtml(data) {
  var meta   = data.meta   || {};
  var config = data.config || {};
  var slides = data.slides || [];

  // Resolve fonts
  var fontKey  = config.font || 'nunito';
  var fontSet  = FONTS[fontKey] || FONTS.nunito;

  // Resolve theme colours
  var colores = config.colores_tema || ['#FF6768', '#4F9AF2', '#11C95B'];
  var accent1 = colores[0] || '#FF6768';
  var accent2 = colores[1] || '#4F9AF2';
  var accent3 = colores[2] || '#11C95B';

  // Build slide HTML fragments
  var total = slides.length;
  var slideFragments = slides.map(function (slide, i) {
    var tipo = slide.tipo || 'texto_simple';
    var contenido = slide.contenido || {};
    var renderer = RENDERERS[tipo];
    if (!renderer) renderer = renderTextoSimple;

    // Render the slide body
    var body;
    if (tipo === 'titulo') {
      body = renderer(contenido, i, total, meta);
    } else {
      body = renderer(contenido, i, total);
    }

    // Build overlays
    var overlays = buildSlideOverlays(slide, config);

    // Per-slide accent override
    var slideStyle = '';
    if (slide.color_acento) {
      slideStyle = ' style="--slide-accent-1:' + esc(slide.color_acento) + ';"';
    }

    // Inject overlays into the slide div (right after opening tag)
    // The body starts with '<div class="slide ...'
    // We insert overlays after the first '>'
    var firstClose = body.indexOf('>');
    var slideHtml = body.substring(0, firstClose);
    // Append inline style if present — merge with existing style if any
    if (slideStyle) {
      // Check if there is already a style attribute
      if (slideHtml.indexOf('style="') !== -1) {
        slideHtml = slideHtml.replace('style="', 'style="--slide-accent-1:' + esc(slide.color_acento) + ';');
      } else {
        slideHtml += slideStyle;
      }
    }
    slideHtml += '>' + overlays + body.substring(firstClose + 1);

    // Wrap in page container
    var isLast = (i === total - 1);
    return '<div class="page-wrapper"' + (isLast ? '' : ' style="page-break-after:always;"') + '>' +
      slideHtml +
    '</div>';
  });

  // Assemble full HTML
  var html = '<!DOCTYPE html>\n' +
    '<html lang="es">\n' +
    '<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>' + esc(meta.titulo || 'Presentacion') + '</title>\n' +
    '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700;800&family=Nunito:wght@400;500;600;700;800&family=Poppins:wght@400;500;600;700;800&family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
    '<style>\n' +
    buildCSS(fontSet, accent1, accent2, accent3) +
    '\n</style>\n' +
    '</head>\n' +
    '<body>\n' +
    slideFragments.join('\n') +
    '\n</body>\n' +
    '</html>';

  return html;
}

// ---------------------------------------------------------------------------
// Full embedded CSS
// ---------------------------------------------------------------------------
function buildCSS(fontSet, accent1, accent2, accent3) {
  return '' +
  // -- Print page setup --
  '@page { size: landscape; margin: 0; }\n' +

  // -- CSS Variables --
  ':root {\n' +
  '  --orange-700: #D14B4C; --orange-600: #E85455; --orange-500: #FF6768; --orange-400: #FF8080;\n' +
  '  --orange-300: #FF9D9D; --orange-200: #FFBABA; --orange-100: #FFD1D1;\n' +
  '  --blue-700: #2F4060; --blue-600: #3C527A; --blue-500: #486394;\n' +
  '  --blue-300: #4F9AF2; --blue-200: #66ADFF; --blue-100: #888DFB;\n' +
  '  --neutral-900: #1F1F1F; --neutral-800: #383838; --neutral-700: #4C4C4C;\n' +
  '  --neutral-600: #616161; --neutral-500: #7D7D7D; --neutral-400: #999999;\n' +
  '  --neutral-300: #BFBFBF; --neutral-200: #D9D9D9; --neutral-100: #EDEDED; --neutral-000: #FFFFFF;\n' +
  '  --success-500: #0EA149; --success-300: #11C95B;\n' +
  '  --warning-500: #DEA528; --warning-300: #FFBD2E; --warning-100: #FFCE66;\n' +
  '  --error-500: #C72115; --error-300: #FF2A1B;\n' +
  '  --yellow-100: #FFF0BF; --yellow-200: #FFE9A1;\n' +
  '  --baby-blue-100: #C9E6FF; --baby-blue-200: #C7DAFF;\n' +
  '  --green-100: #D0FF98; --green-200: #A3C877;\n' +
  '  --pink-100: #FFBFDA; --pink-200: #FF66A6;\n' +
  '  --bg-page: #F9F7F4; --bg-card: #FFFFFF; --bg-section-bar: #F5F3F0;\n' +
  '  --text-primary: #1F1F1F; --text-body: #4C4C4C; --text-secondary: #7D7D7D; --text-muted: #999999;\n' +
  '  --border-default: #EDEDED; --border-input: #D9D9D9; --border-active: #4F9AF2;\n' +
  '  --btn-primary: #FF8080; --btn-primary-hover: #FF6768; --btn-primary-pressed: #E85455;\n' +
  '  --slide-bg: #FFFFFF;\n' +
  '  --slide-accent-1: ' + accent1 + ';\n' +
  '  --slide-accent-2: ' + accent2 + ';\n' +
  '  --slide-accent-3: ' + accent3 + ';\n' +
  '  --heading-font: ' + fontSet.heading + ';\n' +
  '  --body-font: ' + fontSet.body + ';\n' +
  '  --space-xs: 8px; --space-s: 16px; --space-m: 24px; --space-l: 32px;\n' +
  '  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 14px; --radius-xl: 20px; --radius-full: 50%;\n' +
  '  --shadow-sm: 0 1px 3px rgba(0,0,0,0.06); --shadow-md: 0 2px 10px rgba(0,0,0,0.08);\n' +
  '}\n\n' +

  // -- Reset & base --
  '*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }\n' +
  'html, body { width: 100%; height: 100%; margin: 0; padding: 0; background: #fff; }\n' +
  'body { font-family: var(--body-font); color: var(--text-body); -webkit-print-color-adjust: exact; print-color-adjust: exact; }\n' +
  'h1, h2, h3, h4, h5, h6 { font-family: var(--heading-font); }\n\n' +

  // -- Page wrapper --
  '.page-wrapper {\n' +
  '  width: 100vw;\n' +
  '  height: 100vh;\n' +
  '  display: flex;\n' +
  '  align-items: center;\n' +
  '  justify-content: center;\n' +
  '  overflow: hidden;\n' +
  '}\n\n' +

  // -- Slide base --
  '.slide {\n' +
  '  background: var(--slide-bg);\n' +
  '  border: 2px solid var(--border-default);\n' +
  '  border-radius: 20px;\n' +
  '  aspect-ratio: 16 / 9;\n' +
  '  position: relative;\n' +
  '  overflow: hidden;\n' +
  '  box-shadow: 0 4px 20px rgba(0,0,0,0.08);\n' +
  '  width: 100%;\n' +
  '  height: 100%;\n' +
  '  opacity: 1;\n' +
  '  transform: none;\n' +
  '  font-family: var(--body-font);\n' +
  '}\n\n' +

  // -- Background layers --
  '.slide-bg-image { position: absolute; inset: 0; background-size: cover; background-position: center; z-index: 0; pointer-events: none; }\n' +
  '.slide-pattern { position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: 0.12; }\n' +
  '.slide-inner { width: 100%; height: 100%; display: flex; flex-direction: column; padding: 40px 48px; position: relative; z-index: 2; font-family: var(--body-font); }\n' +
  '.slide-counter { position: absolute; bottom: 14px; right: 18px; font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--bg-section-bar); padding: 3px 12px; border-radius: var(--radius-xl); z-index: 3; border: 1px solid var(--border-default); }\n\n' +

  // -- Floating emojis --
  '.slide-emojis { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }\n' +
  '.slide-emoji { position: absolute; font-size: 28px; opacity: 0.18; }\n\n' +

  // -- title-accent underline --
  '.title-accent { display: inline-block; position: relative; font-family: var(--heading-font); }\n' +
  '.title-accent::after { content: \'\'; position: absolute; bottom: -4px; left: 0; width: 40px; height: 3px; border-radius: 2px; background: var(--slide-accent-1); }\n\n' +

  // -- slide-title (all slides that use it) --
  '.slide-title { font-family: var(--heading-font); }\n\n' +

  // -- titulo slide --
  '.slide-titulo { background: linear-gradient(135deg, var(--slide-accent-1), var(--slide-accent-2)); border: none; }\n' +
  '.slide-titulo .slide-inner { justify-content: center; align-items: center; text-align: center; gap: 14px; }\n' +
  '.slide-titulo .materia-tag { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.25); color: #fff; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; padding: 6px 20px; border-radius: var(--radius-xl); font-family: var(--heading-font); }\n' +
  '.slide-titulo .titulo-text { font-size: 46px; font-weight: 800; color: #fff; line-height: 1.15; text-shadow: 0 2px 12px rgba(0,0,0,0.15); font-family: var(--heading-font); }\n' +
  '.slide-titulo .titulo-divider { display: flex; align-items: center; gap: 8px; }\n' +
  '.slide-titulo .titulo-divider .div-line { width: 36px; height: 3px; background: rgba(255,255,255,0.4); border-radius: 2px; }\n' +
  '.slide-titulo .titulo-divider .div-diamond { width: 8px; height: 8px; background: #fff; transform: rotate(45deg); border-radius: 2px; }\n' +
  '.slide-titulo .subtitulo-text { font-size: 16px; color: rgba(255,255,255,0.85); font-weight: 600; font-family: var(--body-font); }\n' +
  '.slide-titulo .footer-info { position: absolute; bottom: 18px; left: 0; right: 0; text-align: center; font-size: 12px; color: rgba(255,255,255,0.6); font-weight: 600; z-index: 3; display: flex; align-items: center; justify-content: center; gap: 8px; }\n' +
  '.slide-titulo .footer-info .fi-dot { width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,0.4); }\n' +
  '.slide-titulo .slide-counter { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.15); }\n' +
  '.slide-titulo .slide-emojis .slide-emoji { opacity: 0.25; }\n\n' +

  // -- texto_simple slide --
  '.slide-texto_simple { background: linear-gradient(135deg, #FFF8E1 0%, #FFF3E0 100%); border: 2px solid #FFE0B2; }\n' +
  '.slide-texto_simple .edge-glow { position: absolute; top: 0; left: 0; bottom: 0; width: 6px; background: linear-gradient(180deg, var(--slide-accent-1), var(--slide-accent-2)); z-index: 3; border-radius: 20px 0 0 20px; }\n' +
  '.slide-texto_simple .slide-inner { justify-content: center; gap: 20px; padding-left: 64px; }\n' +
  '.slide-texto_simple .slide-title { font-size: 30px; font-weight: 800; color: var(--neutral-900); line-height: 1.25; font-family: var(--heading-font); }\n' +
  '.slide-texto_simple .slide-body { font-size: 17px; color: var(--neutral-700); line-height: 1.85; max-width: 90%; font-weight: 500; font-family: var(--body-font); }\n\n' +

  // -- texto_imagen slide --
  '.slide-texto_imagen { background: linear-gradient(160deg, #E3F2FD 0%, #F3E5F5 100%); border: 2px solid #CE93D8; }\n' +
  '.slide-texto_imagen .slide-inner { flex-direction: row; align-items: center; gap: 40px; padding: 44px 52px; }\n' +
  '.slide-texto_imagen .text-side { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 16px; }\n' +
  '.slide-texto_imagen .text-side .slide-title { font-size: 26px; font-weight: 800; color: var(--neutral-900); line-height: 1.25; font-family: var(--heading-font); }\n' +
  '.slide-texto_imagen .text-side .slide-body { font-size: 15px; color: var(--neutral-700); line-height: 1.8; font-family: var(--body-font); }\n' +
  '.slide-texto_imagen .image-side { flex: 1; display: flex; align-items: center; justify-content: center; }\n' +
  '.slide-texto_imagen .image-placeholder { width: 100%; aspect-ratio: 4/3; background: linear-gradient(135deg, rgba(255,255,255,0.6), rgba(206,147,216,0.15)); border: 3px dashed #CE93D8; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 24px; }\n' +
  '.slide-texto_imagen .image-placeholder .ph-label { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #7B1FA2; background: rgba(206,147,216,0.2); padding: 5px 16px; border-radius: 10px; }\n' +
  '.slide-texto_imagen .image-placeholder .ph-text { font-size: 12px; color: var(--neutral-600); text-align: center; font-weight: 500; line-height: 1.5; max-width: 200px; }\n' +
  '.slide-texto_imagen .slide-image { width: 100%; border-radius: 16px; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }\n\n' +

  // -- numero_grande slide --
  '.slide-numero_grande { background: linear-gradient(135deg, var(--slide-accent-1), var(--slide-accent-2)); border: none; }\n' +
  '.slide-numero_grande .slide-inner { justify-content: center; align-items: center; text-align: center; gap: 24px; }\n' +
  '.slide-numero_grande .big-number { font-size: 56px; font-weight: 800; color: #fff; letter-spacing: 2px; line-height: 1.2; text-shadow: 0 3px 15px rgba(0,0,0,0.2); font-family: var(--heading-font); }\n' +
  '.slide-numero_grande .big-desc { font-size: 16px; color: rgba(255,255,255,0.9); font-weight: 600; max-width: 500px; line-height: 1.7; font-family: var(--body-font); }\n' +
  '.slide-numero_grande .slide-counter { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.15); }\n' +
  '.slide-numero_grande .slide-emojis .slide-emoji { opacity: 0.22; }\n\n' +

  // -- lista_iconos slide --
  '.slide-lista_iconos { background: linear-gradient(160deg, #E8F5E9 0%, #F1F8E9 100%); border: 2px solid #A5D6A7; }\n' +
  '.slide-lista_iconos .slide-inner { justify-content: center; gap: 18px; }\n' +
  '.slide-lista_iconos .slide-title { font-size: 26px; font-weight: 800; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-lista_iconos .icon-list { display: flex; flex-direction: column; gap: 7px; }\n' +
  '.slide-lista_iconos .icon-item { display: flex; align-items: flex-start; gap: 14px; background: rgba(255,255,255,0.85); border: 2px solid rgba(255,255,255,0.9); padding: 10px 16px; border-radius: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }\n' +
  '.slide-lista_iconos .icon-circle { min-width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 800; flex-shrink: 0; color: #fff; }\n' +
  '.slide-lista_iconos .icon-item:nth-child(1) .icon-circle { background: linear-gradient(135deg, #FF6B6B, #FF8A80); }\n' +
  '.slide-lista_iconos .icon-item:nth-child(2) .icon-circle { background: linear-gradient(135deg, #42A5F5, #64B5F6); }\n' +
  '.slide-lista_iconos .icon-item:nth-child(3) .icon-circle { background: linear-gradient(135deg, #66BB6A, #81C784); }\n' +
  '.slide-lista_iconos .icon-item:nth-child(4) .icon-circle { background: linear-gradient(135deg, #FFA726, #FFB74D); }\n' +
  '.slide-lista_iconos .icon-item:nth-child(5) .icon-circle { background: linear-gradient(135deg, #AB47BC, #CE93D8); }\n' +
  '.slide-lista_iconos .icon-content { display: flex; flex-direction: column; gap: 2px; padding-top: 3px; }\n' +
  '.slide-lista_iconos .icon-content .item-title { font-size: 16px; font-weight: 700; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-lista_iconos .icon-content .item-desc { font-size: 14px; color: var(--neutral-600); font-weight: 500; line-height: 1.5; font-family: var(--body-font); }\n\n' +

  // -- dos_columnas slide --
  '.slide-dos_columnas { background: linear-gradient(160deg, #E3F2FD 0%, #E8EAF6 100%); border: 2px solid #90CAF9; }\n' +
  '.slide-dos_columnas .slide-inner { justify-content: center; gap: 18px; }\n' +
  '.slide-dos_columnas .slide-title { font-size: 26px; font-weight: 800; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-dos_columnas .columns-container { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; flex: 1; min-height: 0; }\n' +
  '.slide-dos_columnas .column-card { background: rgba(255,255,255,0.9); border: 2px solid rgba(255,255,255,0.95); border-radius: 16px; padding: 20px 22px; display: flex; flex-direction: column; gap: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }\n' +
  '.slide-dos_columnas .column-card:first-child { border-top: 4px solid #FF7043; }\n' +
  '.slide-dos_columnas .column-card:last-child { border-top: 4px solid #42A5F5; }\n' +
  '.slide-dos_columnas .column-card .col-header { display: flex; align-items: center; gap: 10px; }\n' +
  '.slide-dos_columnas .column-card .col-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 17px; font-weight: 800; }\n' +
  '.slide-dos_columnas .column-card:first-child .col-icon { background: #FFCCBC; color: #E64A19; }\n' +
  '.slide-dos_columnas .column-card:last-child .col-icon { background: #BBDEFB; color: #1565C0; }\n' +
  '.slide-dos_columnas .column-card .col-subtitle { font-size: 16px; font-weight: 700; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-dos_columnas .column-card .col-items { display: flex; flex-direction: column; }\n' +
  '.slide-dos_columnas .column-card .col-item { font-size: 15px; color: var(--neutral-700); font-weight: 600; padding: 8px 0; border-bottom: 1px dashed rgba(0,0,0,0.08); font-family: var(--body-font); }\n' +
  '.slide-dos_columnas .column-card .col-item:last-child { border-bottom: none; padding-bottom: 0; }\n\n' +

  // -- tabla slide --
  '.slide-tabla { background: linear-gradient(160deg, #FFF8E1 0%, #FFFDE7 100%); border: 2px solid #FFE082; }\n' +
  '.slide-tabla .slide-inner { justify-content: center; gap: 18px; }\n' +
  '.slide-tabla .slide-title { font-size: 26px; font-weight: 800; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-tabla table { width: 100%; border-collapse: separate; border-spacing: 0; border-radius: 14px; overflow: hidden; border: 2px solid #FFE082; background: rgba(255,255,255,0.9); }\n' +
  '.slide-tabla thead th { background: linear-gradient(135deg, #FFA726, #FFB74D); color: #fff; font-weight: 700; font-size: 12px; padding: 8px 14px; text-align: center; text-shadow: 0 1px 2px rgba(0,0,0,0.1); font-family: var(--heading-font); }\n' +
  '.slide-tabla thead th:first-child { text-align: left; }\n' +
  '.slide-tabla tbody td { font-size: 12px; color: var(--neutral-700); padding: 6px 14px; text-align: center; font-weight: 600; border-bottom: 1px solid #FFF3E0; font-family: var(--body-font); }\n' +
  '.slide-tabla tbody td:first-child { text-align: left; font-weight: 700; color: var(--neutral-900); }\n' +
  '.slide-tabla tbody tr:nth-child(even) td { background: rgba(255,167,38,0.04); }\n' +
  '.slide-tabla tbody tr:last-child td { border-bottom: none; }\n\n' +

  // -- pregunta slide --
  '.slide-pregunta { background: linear-gradient(135deg, #7B1FA2, #AB47BC); border: none; }\n' +
  '.slide-pregunta .slide-inner { justify-content: center; align-items: center; text-align: center; gap: 22px; }\n' +
  '.slide-pregunta .question-circle { width: 80px; height: 80px; background: rgba(255,255,255,0.2); border: 3px solid rgba(255,255,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 42px; font-weight: 800; color: #fff; font-family: var(--heading-font); }\n' +
  '.slide-pregunta .question-text { font-size: 28px; font-weight: 800; color: #fff; line-height: 1.3; max-width: 580px; text-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: var(--heading-font); }\n' +
  '.slide-pregunta .question-hint { font-size: 14px; color: rgba(255,255,255,0.9); font-weight: 600; max-width: 480px; line-height: 1.65; background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); padding: 12px 22px; border-radius: 14px; font-family: var(--body-font); }\n' +
  '.slide-pregunta .slide-counter { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.15); }\n' +
  '.slide-pregunta .slide-emojis .slide-emoji { opacity: 0.2; }\n\n' +

  // -- actividad slide --
  '.slide-actividad { background: linear-gradient(160deg, #FCE4EC 0%, #FFF3E0 100%); border: 2px solid #F48FB1; }\n' +
  '.slide-actividad .slide-inner { justify-content: center; gap: 10px; }\n' +
  '.slide-actividad .act-header { display: flex; align-items: center; gap: 12px; }\n' +
  '.slide-actividad .act-icon { width: 34px; height: 34px; background: linear-gradient(135deg, #E91E63, #F06292); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 10px rgba(233,30,99,0.25); }\n' +
  '.slide-actividad .act-icon svg { width: 16px; height: 16px; }\n' +
  '.slide-actividad .slide-title { font-size: 22px; font-weight: 800; color: #C2185B; font-family: var(--heading-font); }\n' +
  '.slide-actividad .instrucciones { font-size: 13px; color: var(--neutral-700); font-weight: 500; line-height: 1.4; font-family: var(--body-font); }\n' +
  '.slide-actividad .ejercicios-list { display: flex; flex-direction: column; gap: 4px; }\n' +
  '.slide-actividad .ejercicio-card { background: rgba(255,255,255,0.85); border: 1.5px solid rgba(255,255,255,0.9); border-left: 3px solid #E91E63; border-radius: 0 10px 10px 0; padding: 6px 12px; font-size: 13px; font-weight: 600; color: var(--neutral-900); display: flex; align-items: center; gap: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); font-family: var(--body-font); }\n' +
  '.slide-actividad .ej-num { min-width: 24px; height: 24px; border-radius: 6px; background: linear-gradient(135deg, #E91E63, #F06292); color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }\n\n' +

  // -- separador slide --
  '.slide-separador { background: linear-gradient(135deg, var(--slide-accent-2), var(--slide-accent-3, var(--slide-accent-1))); border: none; }\n' +
  '.slide-separador .slide-inner { justify-content: center; align-items: center; text-align: center; gap: 14px; }\n' +
  '.slide-separador .sep-title { font-size: 40px; font-weight: 800; color: #fff; line-height: 1.25; text-shadow: 0 2px 12px rgba(0,0,0,0.15); font-family: var(--heading-font); }\n' +
  '.slide-separador .sep-subtitle { font-size: 18px; color: rgba(255,255,255,0.85); font-weight: 600; font-family: var(--body-font); }\n' +
  '.slide-separador .slide-counter { background: rgba(255,255,255,0.2); color: rgba(255,255,255,0.7); border-color: rgba(255,255,255,0.15); }\n' +
  '.slide-separador .slide-emojis .slide-emoji { opacity: 0.25; }\n\n' +

  // -- cierre slide --
  '.slide-cierre { background: linear-gradient(160deg, #E8F5E9 0%, #FFF8E1 100%); border: 2px solid #A5D6A7; }\n' +
  '.slide-cierre .slide-inner { justify-content: center; gap: 16px; padding-top: 44px; }\n' +
  '.slide-cierre .cierre-header { display: flex; align-items: center; gap: 14px; }\n' +
  '.slide-cierre .cierre-star { width: 48px; height: 48px; background: linear-gradient(135deg, #FFA726, #FFB74D); border-radius: 14px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; box-shadow: 0 3px 10px rgba(255,167,38,0.3); }\n' +
  '.slide-cierre .slide-title { font-size: 30px; font-weight: 800; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-cierre .cierre-resumen { font-size: 14px; color: var(--neutral-700); line-height: 1.6; max-width: 92%; font-family: var(--body-font); }\n' +
  '.slide-cierre .tarea-card { background: rgba(255,255,255,0.85); border: 2px solid #FFE082; border-left: 5px solid #FFA726; border-radius: 14px; padding: 12px 18px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }\n' +
  '.slide-cierre .tarea-label { font-size: 12px; font-weight: 800; color: #E65100; letter-spacing: 2px; display: flex; align-items: center; gap: 6px; font-family: var(--heading-font); }\n' +
  '.slide-cierre .tarea-text { font-size: 14px; color: var(--neutral-700); font-weight: 500; line-height: 1.7; font-family: var(--body-font); }\n\n' +

  // -- lista_bullets slide --
  '.slide-lista_bullets { background: linear-gradient(160deg, #EDE7F6 0%, #F3E5F5 100%); border: 2px solid #CE93D8; }\n' +
  '.slide-lista_bullets .slide-inner { justify-content: center; gap: 18px; }\n' +
  '.slide-lista_bullets .slide-title { font-size: 26px; font-weight: 800; color: var(--neutral-900); font-family: var(--heading-font); }\n' +
  '.slide-lista_bullets .bullet-list { display: flex; flex-direction: column; gap: 6px; }\n' +
  '.slide-lista_bullets .bullet-item { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: var(--neutral-700); line-height: 1.5; background: rgba(255,255,255,0.7); padding: 8px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.9); font-family: var(--body-font); }\n' +
  '.slide-lista_bullets .bullet-dot { min-width: 12px; height: 12px; background: linear-gradient(135deg, #AB47BC, #CE93D8); border-radius: 50%; margin-top: 5px; flex-shrink: 0; }\n';
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = { buildPresentationHtml: buildPresentationHtml };
