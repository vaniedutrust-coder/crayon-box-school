/**
 * CRAYON BOX SCHOOL — IN-BROWSER VISUAL PAGE EDITOR (VANILLA JS)
 * Zero external dependencies. Works on all 16 school pages.
 */
(function() {
  // Only initialize if editor mode requested or admin session active
  const urlParams = new URLSearchParams(window.location.search);
  const isEditorParam = urlParams.get('editor') === 'true';

  if (!isEditorParam && !window.__CBS_FORCE_EDITOR__) {
    return;
  }

  // Derive current filename
  let pageName = window.location.pathname.split('/').pop() || 'index.html';
  if (!pageName.endsWith('.html')) pageName = 'index.html';

  let isDirty = false;
  let isEditMode = true;
  let activeImageTarget = null;

  // School asset quick presets
  const SCHOOL_ASSETS = [
    { name: 'Happy Students on Campus', url: 'hero-students.jpg' },
    { name: 'Outdoor Play & Athletics', url: 'kids-running-grass.jpg' },
    { name: 'STEAM & Science Labs', url: 'life-science.jpg' },
    { name: 'Sports Complex & Courts', url: 'life-sports.jpg' },
    { name: 'Visual & Performing Arts', url: 'life-arts.jpg' },
    { name: 'Modern Campus Architecture', url: 'life-campus.jpg' },
    { name: 'Interactive Classrooms', url: 'life-classrooms.jpg' },
    { name: 'Cultural Celebrations', url: 'life-celebrations.jpg' },
    { name: 'Faculty Mentorship', url: 'faculty-mentoring.jpg' },
    { name: 'Parent Connect & ERP Hub', url: 'parent-app-connect.jpg' },
    { name: 'Kindergarten Early Years', url: 'stage-kindergarten.jpg' },
    { name: 'Official School Crest', url: 'cb-logo-circular.png' }
  ];

  // 6 Pre-designed School Section Components
  const SECTION_TEMPLATES = {
    feature_grid: {
      name: 'Feature Grid (3 Cards)',
      icon: '🌟',
      desc: 'Three pillar cards for facilities, curriculum highlights, or values.',
      html: `
    <section class="section" style="padding: 60px 0; background: #FFFFFF;">
      <div class="container">
        <div class="section-header-center" style="text-align: center; margin-bottom: 40px;">
          <span class="spotlight-tag tag-blue">🌟 CORE EXCELLENCE</span>
          <h2 style="font-family: var(--font-serif); font-size: clamp(2rem, 3.2vw, 2.8rem); color: var(--navy); margin: 12px 0 8px;">Nurturing Every Dimension</h2>
          <p style="font-size: 1.05rem; color: var(--text-muted); max-width: 600px; margin: 0 auto;">Comprehensive growth through academic vigor, artistic expression, and emotional strength.</p>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px;">
          <div class="content-card shine-card" style="padding: 30px; background: #FDFBF7; border-radius: var(--radius-lg); border: 1px solid rgba(6,36,76,0.06); text-align: left;">
            <div style="font-size: 2.2rem; margin-bottom: 14px;">🔬</div>
            <h3 style="font-family: var(--font-serif); color: var(--navy); font-size: 1.35rem; margin-bottom: 10px;">Hands-On STEM &amp; Labs</h3>
            <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.6;">Equipped science and computing labs that transform textbook theories into lively experimental discovery.</p>
          </div>
          <div class="content-card shine-card" style="padding: 30px; background: #FDFBF7; border-radius: var(--radius-lg); border: 1px solid rgba(6,36,76,0.06); text-align: left;">
            <div style="font-size: 2.2rem; margin-bottom: 14px;">🎨</div>
            <h3 style="font-family: var(--font-serif); color: var(--navy); font-size: 1.35rem; margin-bottom: 10px;">Creative &amp; Visual Arts</h3>
            <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.6;">Daily pottery, sketching, drama, and vocal studios that ignite imagination and expressive self-confidence.</p>
          </div>
          <div class="content-card shine-card" style="padding: 30px; background: #FDFBF7; border-radius: var(--radius-lg); border: 1px solid rgba(6,36,76,0.06); text-align: left;">
            <div style="font-size: 2.2rem; margin-bottom: 14px;">🏅</div>
            <h3 style="font-family: var(--font-serif); color: var(--navy); font-size: 1.35rem; margin-bottom: 10px;">Sports &amp; Team Ethics</h3>
            <p style="font-size: 0.95rem; color: var(--text-main); line-height: 1.6;">Multi-sport courts and certified coaches fostering resilience, sportsmanship, and lifelong physical health.</p>
          </div>
        </div>
      </div>
    </section>`
    },
    stat_row: {
      name: 'Metric Counter Row (4 Stats)',
      icon: '📊',
      desc: 'High-contrast achievement band highlighting numerical metrics.',
      html: `
    <section class="section" style="padding: 50px 0; background: linear-gradient(135deg, #06244C 0%, #03152C 100%); color: #FFFFFF;">
      <div class="container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 30px; text-align: center;">
          <div>
            <div style="font-family: var(--font-serif); font-size: 2.8rem; font-weight: 700; color: var(--gold); line-height: 1; margin-bottom: 8px;">100%</div>
            <div style="font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #FFFFFF;">Board Exam Success</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Consistent academic distinction</div>
          </div>
          <div>
            <div style="font-family: var(--font-serif); font-size: 2.8rem; font-weight: 700; color: var(--gold); line-height: 1; margin-bottom: 8px;">1:12</div>
            <div style="font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #FFFFFF;">Teacher-Student Ratio</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Individualized attention &amp; care</div>
          </div>
          <div>
            <div style="font-family: var(--font-serif); font-size: 2.8rem; font-weight: 700; color: var(--gold); line-height: 1; margin-bottom: 8px;">25+</div>
            <div style="font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #FFFFFF;">Co-Curricular Clubs</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Robotics, arts, music &amp; debate</div>
          </div>
          <div>
            <div style="font-family: var(--font-serif); font-size: 2.8rem; font-weight: 700; color: var(--gold); line-height: 1; margin-bottom: 8px;">100%</div>
            <div style="font-size: 1rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #FFFFFF;">CCTV &amp; Safe Campus</div>
            <div style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-top: 4px;">Verified staff &amp; GPS tracking</div>
          </div>
        </div>
      </div>
    </section>`
    },
    testimonial: {
      name: 'Parent / Student Testimonial',
      icon: '💬',
      desc: 'Warm editorial quote card with 5-star rating and parent citation.',
      html: `
    <section class="section" style="padding: 60px 0; background: #F4EFE6;">
      <div class="container" style="max-width: 860px;">
        <div style="background: #FFFFFF; border-radius: var(--radius-xl); padding: 44px; box-shadow: 0 10px 35px rgba(6,36,76,0.06); border: 1px solid rgba(6,36,76,0.08); text-align: center; position: relative;">
          <span style="font-size: 3rem; color: var(--gold); line-height: 1; display: block; margin-bottom: 10px;">“</span>
          <blockquote style="font-family: var(--font-serif); font-size: clamp(1.2rem, 1.8vw, 1.55rem); color: var(--navy); line-height: 1.5; margin: 0 0 24px; font-style: italic;">
            Crayon Box School is the best decision we made for our daughter. The balance of academic rigor, teacher warmth, and emotional safety is truly unparalleled in North Delhi.
          </blockquote>
          <div style="display: flex; justify-content: center; gap: 4px; color: #F59E0B; font-size: 1.2rem; margin-bottom: 14px;">
            ★★★★★
          </div>
          <div>
            <strong style="font-family: var(--font-heading); color: var(--navy); font-size: 1.1rem; display: block;">Dr. Ananya &amp; Rajesh Sharma</strong>
            <span style="font-size: 0.88rem; color: var(--text-muted);">Parents of Aanya (Class 5) &bull; Burari Campus</span>
          </div>
        </div>
      </div>
    </section>`
    },
    faq_accordion: {
      name: 'Expandable FAQ Accordion',
      icon: '❓',
      desc: 'Three collapsible Q&A items answering common parental questions.',
      html: `
    <section class="section" style="padding: 60px 0; background: #FFFFFF;">
      <div class="container" style="max-width: 800px;">
        <div class="section-header-center" style="text-align: center; margin-bottom: 36px;">
          <span class="spotlight-tag tag-blue">❓ CLARITY &amp; ANSWERS</span>
          <h2 style="font-family: var(--font-serif); font-size: clamp(1.8rem, 2.8vw, 2.4rem); color: var(--navy); margin: 10px 0;">Frequently Asked Questions</h2>
        </div>
        <div class="faq-accordion" style="display: flex; flex-direction: column; gap: 14px;">
          <details style="background: #FDFBF7; border: 1px solid rgba(6,36,76,0.08); border-radius: 12px; padding: 18px 24px; cursor: pointer;">
            <summary style="font-weight: 700; color: var(--navy); font-size: 1.05rem;">What are the primary admission criteria and age cut-offs?</summary>
            <p style="margin-top: 12px; color: var(--text-main); font-size: 0.95rem; line-height: 1.6;">Admissions are based on age eligibility as per DoE guidelines and an informal interaction designed to understand the child's learning readiness.</p>
          </details>
          <details style="background: #FDFBF7; border: 1px solid rgba(6,36,76,0.08); border-radius: 12px; padding: 18px 24px; cursor: pointer;">
            <summary style="font-weight: 700; color: var(--navy); font-size: 1.05rem;">Is school bus transport available across Burari and adjoining areas?</summary>
            <p style="margin-top: 12px; color: var(--text-main); font-size: 0.95rem; line-height: 1.6;">Yes, GPS-enabled air-conditioned buses with female attendants and live CCTV feeds cover Burari, Sant Nagar, Timarpur, and nearby neighborhoods.</p>
          </details>
          <details style="background: #FDFBF7; border: 1px solid rgba(6,36,76,0.08); border-radius: 12px; padding: 18px 24px; cursor: pointer;">
            <summary style="font-weight: 700; color: var(--navy); font-size: 1.05rem;">What is the student-to-teacher ratio in classrooms?</summary>
            <p style="margin-top: 12px; color: var(--text-main); font-size: 0.95rem; line-height: 1.6;">We maintain an optimal 1:12 ratio in foundational stages and 1:20 in middle school to ensure personalized mentorship for every child.</p>
          </details>
        </div>
      </div>
    </section>`
    },
    media_split: {
      name: 'Media & Story Split',
      icon: '🖼️',
      desc: '2-column layout with photo, narrative paragraph, and checkmarks.',
      html: `
    <section class="section" style="padding: 70px 0; background: #FFFFFF;">
      <div class="container">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 48px; align-items: center;">
          <div>
            <div style="border-radius: var(--radius-xl); overflow: hidden; box-shadow: 0 16px 40px rgba(6,36,76,0.12); border: 4px solid #FFFFFF;">
              <img src="life-science.jpg" alt="Students engaged in science inquiry" style="width: 100%; height: 380px; object-fit: cover; display: block;">
            </div>
          </div>
          <div>
            <span class="spotlight-tag tag-blue">🌱 EXPERIENTIAL LEARNING</span>
            <h2 style="font-family: var(--font-serif); font-size: clamp(2rem, 3vw, 2.6rem); color: var(--navy); margin: 14px 0 18px; line-height: 1.2;">
              Learning That Extends <span class="highlight-crayon highlight-crayon-gold">Far Beyond</span> The Blackboard
            </h2>
            <p style="font-size: 1.05rem; color: var(--text-main); line-height: 1.7; margin-bottom: 20px;">
              Our pedagogy replaces rote memorization with inquiry-led projects, outdoor nature studies, and collaborative lab sessions that spark authentic curiosity.
            </p>
            <ul style="list-style: none; padding: 0; margin: 0 0 28px; display: flex; flex-direction: column; gap: 10px;">
              <li style="font-size: 0.96rem; color: var(--navy); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="color: #2E7D32;">✓</span> Project-based inquiry curriculum aligned to NEP 2020
              </li>
              <li style="font-size: 0.96rem; color: var(--navy); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="color: #2E7D32;">✓</span> Dedicated makerspace and robotics challenges
              </li>
              <li style="font-size: 0.96rem; color: var(--navy); font-weight: 600; display: flex; align-items: center; gap: 8px;">
                <span style="color: #2E7D32;">✓</span> Daily reflection journals and mentoring sessions
              </li>
            </ul>
            <a href="academics.html" class="btn btn-primary">Discover Academic Pathways &rarr;</a>
          </div>
        </div>
      </div>
    </section>`
    },
    crayon_cta: {
      name: 'Signature Crayon Highlight CTA',
      icon: '📣',
      desc: 'Full-width banner with gold brush stroke headline and dual CTA buttons.',
      html: `
    <section class="section-final-banner" style="padding: 70px 0; background: linear-gradient(135deg, #06244C 0%, #03152C 100%); color: #FFFFFF; text-align: center;">
      <div class="container" style="max-width: 820px;">
        <span class="spotlight-tag tag-gold" style="background: rgba(229,169,60,0.2); color: var(--gold); border: 1px solid rgba(229,169,60,0.4); margin-bottom: 16px; display: inline-block;">
          ✨ LIMITED SEATS FOR 2026–27
        </span>
        <h2 style="font-family: var(--font-serif); font-size: clamp(2.2rem, 3.8vw, 3.2rem); color: #FFFFFF; margin: 0 0 16px; line-height: 1.2;">
          Give Your Child The Gift of <span class="highlight-crayon highlight-crayon-gold" style="color: #FFFFFF;">Joyful Discovery</span>
        </h2>
        <p style="font-size: 1.15rem; color: rgba(255,255,255,0.85); line-height: 1.6; margin: 0 auto 32px; max-width: 640px;">
          Schedule a personalized campus walkthrough or complete your admission application online in under 5 minutes.
        </p>
        <div style="display: flex; justify-content: center; flex-wrap: wrap; gap: 16px;">
          <a href="admissions.html" class="btn btn-gold btn-lg">Apply Online Now &rarr;</a>
          <a href="contact.html" class="btn btn-outline-white btn-lg">Book Campus Tour</a>
        </div>
      </div>
    </section>`
    }
  };

  function showToast(msg, isSuccess = true) {
    let toast = document.getElementById('cbsEditorToast');
    if (!toast) return;
    toast.innerHTML = (isSuccess ? '✅ ' : '⚠️ ') + msg;
    toast.style.display = 'flex';
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.style.display = 'none';
    }, 4500);
  }

  function setDirty(state = true) {
    isDirty = state;
    const pill = document.getElementById('cbsDirtyPill');
    if (pill) pill.style.display = isDirty ? 'inline-block' : 'none';
  }

  // Inject Editor Dock & Modals
  function initEditorUI() {
    document.body.classList.add('cbs-editor-active', 'cbs-mode-edit');

    // 1. Top Editor Dock
    const dock = document.createElement('div');
    dock.id = 'cbsVisualEditorDock';
    dock.setAttribute('data-cbs-editor', 'true');
    dock.innerHTML = `
      <div class="cbs-dock-left">
        <div class="cbs-editor-brand">
          <img src="cb-logo-circular.png" alt="CBS">
          <span>Visual Editor</span>
        </div>
        <span class="cbs-page-badge">${pageName}</span>
        <span id="cbsDirtyPill" class="cbs-dirty-pill">Unsaved Changes</span>
      </div>

      <div class="cbs-dock-center">
        <div class="cbs-mode-toggle">
          <button type="button" class="cbs-mode-btn active" id="cbsBtnEditMode">✏️ Edit Mode</button>
          <button type="button" class="cbs-mode-btn" id="cbsBtnPreviewMode">👁️ Preview</button>
        </div>

        <button type="button" class="cbs-dock-btn" id="cbsBtnHighlight" title="Add Crayon Highlight to Selection">
          🎨 Highlight
        </button>
        <button type="button" class="cbs-dock-btn" id="cbsBtnLink" title="Add or Edit Link">
          🔗 Link
        </button>
        <button type="button" class="cbs-dock-btn" id="cbsBtnAddSection" title="Insert a pre-designed school section component">
          ➕ Add Section
        </button>
      </div>

      <div class="cbs-dock-right">
        <button type="button" class="cbs-dock-btn" id="cbsBtnSeoModal">⚙️ Page SEO</button>
        <button type="button" class="cbs-dock-btn" id="cbsBtnReset">↩️ Reset</button>
        <button type="button" class="cbs-dock-btn save-btn" id="cbsBtnSave">💾 Save &amp; Publish</button>
        <button type="button" class="cbs-dock-btn exit-btn" id="cbsBtnExit">✖ Exit</button>
      </div>
    `;
    document.body.prepend(dock);

    // 2. Image Swap Modal
    const imgModal = document.createElement('div');
    imgModal.id = 'cbsImageModal';
    imgModal.className = 'cbs-editor-modal-backdrop';
    imgModal.setAttribute('data-cbs-editor', 'true');
    imgModal.innerHTML = `
      <div class="cbs-editor-modal">
        <div class="cbs-modal-header">
          <h3>📷 Image Swapper &amp; Media Manager</h3>
          <button class="cbs-modal-close" id="cbsCloseImageModal">&times;</button>
        </div>

        <div class="cbs-image-preview-box">
          <img id="cbsImgModalPreview" src="" alt="Image Preview">
        </div>

        <div class="cbs-form-group">
          <label>Image Source URL / Path</label>
          <input type="text" id="cbsImgSrcInput" class="cbs-form-input" placeholder="e.g. campus_steam_robotics_lab.png">
        </div>

        <div class="cbs-form-group">
          <label>Image Alt Text (SEO &amp; Accessibility)</label>
          <input type="text" id="cbsImgAltInput" class="cbs-form-input" placeholder="Descriptive alternative text">
        </div>

        <div class="cbs-form-group">
          <label>Upload New Image From Device</label>
          <input type="file" id="cbsImgFileInput" accept="image/*" class="cbs-form-input" style="padding: 6px;">
          <span class="cbs-form-help">Supported: JPG, PNG, WebP, SVG. Stored in /uploads/images/</span>
        </div>

        <div class="cbs-form-group">
          <label>Pick From School Asset Presets</label>
          <div class="cbs-asset-grid" id="cbsAssetGrid"></div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="cbs-dock-btn" id="cbsCancelImgBtn" style="color: #4A5568; background: #EDF2F7; border: 1px solid #CBD5E0;">Cancel</button>
          <button type="button" class="cbs-dock-btn save-btn" id="cbsApplyImgBtn">Apply Image to Page</button>
        </div>
      </div>
    `;
    document.body.appendChild(imgModal);

    // 3. Page SEO & Metadata Modal
    const seoModal = document.createElement('div');
    seoModal.id = 'cbsSeoModal';
    seoModal.className = 'cbs-editor-modal-backdrop';
    seoModal.setAttribute('data-cbs-editor', 'true');
    seoModal.innerHTML = `
      <div class="cbs-editor-modal">
        <div class="cbs-modal-header">
          <h3>⚙️ Page SEO &amp; Social Meta Tags</h3>
          <button class="cbs-modal-close" id="cbsCloseSeoModal">&times;</button>
        </div>

        <div class="cbs-form-group">
          <label>HTML &lt;title&gt; Tag</label>
          <input type="text" id="cbsMetaTitle" class="cbs-form-input">
          <span class="cbs-form-help">Optimal: 50–60 characters. Appears as Google search headline.</span>
        </div>

        <div class="cbs-form-group">
          <label>Meta Description</label>
          <textarea id="cbsMetaDesc" class="cbs-form-textarea" rows="3"></textarea>
          <span class="cbs-form-help">Optimal: 140–160 characters. Appears in search results snippet.</span>
        </div>

        <div class="cbs-form-group">
          <label>Open Graph Title (Facebook / WhatsApp / LinkedIn)</label>
          <input type="text" id="cbsOgTitle" class="cbs-form-input">
        </div>

        <div class="cbs-form-group">
          <label>Open Graph Description</label>
          <textarea id="cbsOgDesc" class="cbs-form-textarea" rows="2"></textarea>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
          <button type="button" class="cbs-dock-btn" id="cbsCancelSeoBtn" style="color: #4A5568; background: #EDF2F7; border: 1px solid #CBD5E0;">Cancel</button>
          <button type="button" class="cbs-dock-btn save-btn" id="cbsApplySeoBtn">Apply Meta Tags</button>
        </div>
      </div>
    `;
    document.body.appendChild(seoModal);

    // 4. Section Component Picker Modal
    const secModal = document.createElement('div');
    secModal.id = 'cbsSectionModal';
    secModal.className = 'cbs-editor-modal-backdrop';
    secModal.setAttribute('data-cbs-editor', 'true');
    secModal.innerHTML = `
      <div class="cbs-editor-modal cbs-modal-lg">
        <div class="cbs-modal-header">
          <h3>➕ Insert Pre-Designed School Section</h3>
          <button class="cbs-modal-close" id="cbsCloseSectionModal">&times;</button>
        </div>
        <p style="font-size: 0.88rem; color: #718096; margin-top: 0; margin-bottom: 16px;">
          Select any pre-styled Crayon Box component block below. It will be inserted into this page immediately, ready for you to customize copy and images inline.
        </p>
        <div class="cbs-section-grid" id="cbsSectionGrid"></div>
        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
          <button type="button" class="cbs-dock-btn" id="cbsCancelSectionBtn" style="color: #4A5568; background: #EDF2F7; border: 1px solid #CBD5E0;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(secModal);

    // 5. Toast Notification
    const toast = document.createElement('div');
    toast.id = 'cbsEditorToast';
    toast.setAttribute('data-cbs-editor', 'true');
    document.body.appendChild(toast);

    // Populate Asset Grid
    const assetGrid = document.getElementById('cbsAssetGrid');
    SCHOOL_ASSETS.forEach(item => {
      const thumb = document.createElement('div');
      thumb.className = 'cbs-asset-thumb';
      thumb.title = item.name;
      thumb.innerHTML = `<img src="${item.url}" alt="${item.name}">`;
      thumb.addEventListener('click', () => {
        document.getElementById('cbsImgSrcInput').value = item.url;
        document.getElementById('cbsImgModalPreview').src = item.url;
        document.getElementById('cbsImgAltInput').value = item.name;
      });
      assetGrid.appendChild(thumb);
    });

    // Populate Section Component Grid
    const secGrid = document.getElementById('cbsSectionGrid');
    Object.keys(SECTION_TEMPLATES).forEach(key => {
      const item = SECTION_TEMPLATES[key];
      const card = document.createElement('div');
      card.className = 'cbs-section-card';
      card.innerHTML = `
        <div>
          <div class="cbs-section-card-icon">${item.icon}</div>
          <div class="cbs-section-card-title">${item.name}</div>
          <div class="cbs-section-card-desc">${item.desc}</div>
        </div>
        <button type="button" class="cbs-section-card-btn" data-sec-key="${key}">
          ➕ Insert Section
        </button>
      `;
      card.querySelector('button').addEventListener('click', () => {
        insertSectionTemplate(key);
      });
      secGrid.appendChild(card);
    });

    bindEvents();
    makeContentEditable();
    bindImages();
  }

  // Make text content elements editable
  function makeContentEditable() {
    const selector = 'h1, h2, h3, h4, h5, h6, p, li, figcaption, .spotlight-tag, .section-subtitle, .hero-tag, .stat-label, .testimonial-quote, .feature-desc';
    const elements = document.querySelectorAll(selector);

    elements.forEach(el => {
      // Avoid editor UI elements
      if (el.closest('[data-cbs-editor]')) return;

      el.setAttribute('data-cbs-editable', 'true');
      el.contentEditable = isEditMode ? 'true' : 'false';

      el.addEventListener('input', () => {
        setDirty(true);
      });
    });
  }

  // Bind image swapping overlays
  function bindImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (img.closest('[data-cbs-editor]')) return;

      // Avoid double wrapping
      if (img.parentElement && img.parentElement.classList.contains('cbs-image-wrapper')) return;

      const parent = img.parentElement;
      if (!parent) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'cbs-image-wrapper';
      wrapper.setAttribute('data-cbs-editor-wrapper', 'true');

      parent.insertBefore(wrapper, img);
      wrapper.appendChild(img);

      const swapBtn = document.createElement('button');
      swapBtn.type = 'button';
      swapBtn.className = 'cbs-image-swap-btn';
      swapBtn.setAttribute('data-cbs-editor', 'true');
      swapBtn.innerHTML = '📷 Swap Image';
      wrapper.appendChild(swapBtn);

      swapBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openImageModal(img);
      });
    });
  }

  function openImageModal(img) {
    activeImageTarget = img;
    const currentSrc = img.getAttribute('src') || '';
    const currentAlt = img.getAttribute('alt') || '';

    document.getElementById('cbsImgSrcInput').value = currentSrc;
    document.getElementById('cbsImgAltInput').value = currentAlt;
    document.getElementById('cbsImgModalPreview').src = currentSrc;
    document.getElementById('cbsImageModal').classList.add('open');
  }

  function closeImageModal() {
    document.getElementById('cbsImageModal').classList.remove('open');
    activeImageTarget = null;
  }

  function openSeoModal() {
    document.getElementById('cbsMetaTitle').value = document.title || '';
    
    const descTag = document.querySelector('meta[name="description"]');
    document.getElementById('cbsMetaDesc').value = descTag ? descTag.getAttribute('content') : '';

    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    document.getElementById('cbsOgTitle').value = ogTitleTag ? ogTitleTag.getAttribute('content') : '';

    const ogDescTag = document.querySelector('meta[property="og:description"]');
    document.getElementById('cbsOgDesc').value = ogDescTag ? ogDescTag.getAttribute('content') : '';

    document.getElementById('cbsSeoModal').classList.add('open');
  }

  function closeSeoModal() {
    document.getElementById('cbsSeoModal').classList.remove('open');
  }

  function openSectionModal() {
    document.getElementById('cbsSectionModal').classList.add('open');
  }

  function closeSectionModal() {
    document.getElementById('cbsSectionModal').classList.remove('open');
  }

  function insertSectionTemplate(key) {
    const template = SECTION_TEMPLATES[key];
    if (!template) return;

    const temp = document.createElement('div');
    temp.innerHTML = template.html.trim();
    const newSection = temp.firstElementChild;
    if (!newSection) return;

    // Determine insertion position:
    // If active element is within a section, insert after that section.
    // Otherwise, insert before footer or append to main.
    const activeEl = document.activeElement;
    let targetSection = activeEl ? activeEl.closest('section') : null;

    if (targetSection && targetSection.parentNode && !targetSection.closest('[data-cbs-editor]')) {
      targetSection.parentNode.insertBefore(newSection, targetSection.nextSibling);
    } else {
      const footer = document.querySelector('footer.site-footer') || document.querySelector('footer');
      if (footer && footer.parentNode) {
        footer.parentNode.insertBefore(newSection, footer);
      } else {
        const main = document.querySelector('main') || document.body;
        main.appendChild(newSection);
      }
    }

    // Refresh editable nodes and image wrappers
    makeContentEditable();
    bindImages();

    // Mark page dirty
    setDirty(true);
    closeSectionModal();

    // Smooth scroll to the newly inserted section
    setTimeout(() => {
      newSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newSection.style.outline = '3px solid #E5A93C';
      setTimeout(() => {
        newSection.style.outline = '';
      }, 2500);
    }, 150);

    showToast(`Inserted "${template.name}"! Click text to edit or swap images.`);
  }

  function bindEvents() {
    // Mode Switch
    const btnEdit = document.getElementById('cbsBtnEditMode');
    const btnPreview = document.getElementById('cbsBtnPreviewMode');

    btnEdit.addEventListener('click', () => {
      isEditMode = true;
      btnEdit.classList.add('active');
      btnPreview.classList.remove('active');
      document.body.classList.add('cbs-mode-edit');
      document.body.classList.remove('cbs-mode-preview');
      document.querySelectorAll('[data-cbs-editable="true"]').forEach(el => el.contentEditable = 'true');
      showToast('Edit Mode Active: Click any heading or paragraph to edit.');
    });

    btnPreview.addEventListener('click', () => {
      isEditMode = false;
      btnPreview.classList.add('active');
      btnEdit.classList.remove('active');
      document.body.classList.remove('cbs-mode-edit');
      document.body.classList.add('cbs-mode-preview');
      document.querySelectorAll('[data-cbs-editable="true"]').forEach(el => el.contentEditable = 'false');
      showToast('Preview Mode: Outlines hidden. Interactive preview active.');
    });

    // Formatting: Highlight
    document.getElementById('cbsBtnHighlight').addEventListener('click', () => {
      const sel = window.getSelection();
      if (!sel.rangeCount || sel.isCollapsed) {
        showToast('Please select text to apply highlight.', false);
        return;
      }
      const span = document.createElement('span');
      span.className = 'highlight-crayon';
      const range = sel.getRangeAt(0);
      span.appendChild(range.extractContents());
      range.insertNode(span);
      setDirty(true);
      showToast('Crayon highlight applied!');
    });

    // Formatting: Link
    document.getElementById('cbsBtnLink').addEventListener('click', () => {
      const url = prompt('Enter link destination URL:', 'admissions.html');
      if (url) {
        document.execCommand('createLink', false, url);
        setDirty(true);
        showToast('Link inserted.');
      }
    });

    // Modals
    document.getElementById('cbsBtnSeoModal').addEventListener('click', openSeoModal);
    document.getElementById('cbsCloseSeoModal').addEventListener('click', closeSeoModal);
    document.getElementById('cbsCancelSeoBtn').addEventListener('click', closeSeoModal);

    // Section Component Modal
    document.getElementById('cbsBtnAddSection').addEventListener('click', openSectionModal);
    document.getElementById('cbsCloseSectionModal').addEventListener('click', closeSectionModal);
    document.getElementById('cbsCancelSectionBtn').addEventListener('click', closeSectionModal);

    document.getElementById('cbsApplySeoBtn').addEventListener('click', () => {
      const newTitle = document.getElementById('cbsMetaTitle').value.trim();
      const newDesc = document.getElementById('cbsMetaDesc').value.trim();
      const newOgTitle = document.getElementById('cbsOgTitle').value.trim();
      const newOgDesc = document.getElementById('cbsOgDesc').value.trim();

      if (newTitle) document.title = newTitle;

      let descTag = document.querySelector('meta[name="description"]');
      if (!descTag && newDesc) {
        descTag = document.createElement('meta');
        descTag.name = 'description';
        document.head.appendChild(descTag);
      }
      if (descTag) descTag.setAttribute('content', newDesc);

      let ogTitleTag = document.querySelector('meta[property="og:title"]');
      if (!ogTitleTag && newOgTitle) {
        ogTitleTag = document.createElement('meta');
        ogTitleTag.setAttribute('property', 'og:title');
        document.head.appendChild(ogTitleTag);
      }
      if (ogTitleTag) ogTitleTag.setAttribute('content', newOgTitle);

      let ogDescTag = document.querySelector('meta[property="og:description"]');
      if (!ogDescTag && newOgDesc) {
        ogDescTag = document.createElement('meta');
        ogDescTag.setAttribute('property', 'og:description');
        document.head.appendChild(ogDescTag);
      }
      if (ogDescTag) ogDescTag.setAttribute('content', newOgDesc);

      setDirty(true);
      closeSeoModal();
      showToast('Page SEO & Meta Tags updated!');
    });

    // Image Modal
    document.getElementById('cbsCloseImageModal').addEventListener('click', closeImageModal);
    document.getElementById('cbsCancelImgBtn').addEventListener('click', closeImageModal);

    const imgSrcInput = document.getElementById('cbsImgSrcInput');
    imgSrcInput.addEventListener('input', () => {
      document.getElementById('cbsImgModalPreview').src = imgSrcInput.value;
    });

    // File Upload handling for images
    const imgFileInput = document.getElementById('cbsImgFileInput');
    imgFileInput.addEventListener('change', async () => {
      if (!imgFileInput.files || !imgFileInput.files.length) return;
      const file = imgFileInput.files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          showToast('Uploading image to server...');
          const res = await fetch('/api/editor/upload-image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              base64Data: reader.result
            })
          });
          const d = await res.json();
          if (d.success && d.imageUrl) {
            document.getElementById('cbsImgSrcInput').value = d.imageUrl;
            document.getElementById('cbsImgModalPreview').src = d.imageUrl;
            showToast('Image uploaded successfully!');
          } else {
            showToast('Upload failed: ' + (d.error || 'Server error'), false);
          }
        } catch (e) {
          showToast('Image upload failed: ' + e.message, false);
        }
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('cbsApplyImgBtn').addEventListener('click', () => {
      if (!activeImageTarget) return;
      const newSrc = document.getElementById('cbsImgSrcInput').value.trim();
      const newAlt = document.getElementById('cbsImgAltInput').value.trim();

      if (newSrc) activeImageTarget.setAttribute('src', newSrc);
      if (newAlt) activeImageTarget.setAttribute('alt', newAlt);

      setDirty(true);
      closeImageModal();
      showToast('Image updated on page!');
    });

    // Reset Page
    document.getElementById('cbsBtnReset').addEventListener('click', () => {
      if (confirm('Discard unsaved visual edits and reload original page?')) {
        window.location.reload();
      }
    });

    // Exit Editor
    document.getElementById('cbsBtnExit').addEventListener('click', () => {
      if (isDirty && !confirm('You have unsaved changes. Exit editor without saving?')) {
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.delete('editor');
      window.location.href = url.toString();
    });

    // Save Page
    document.getElementById('cbsBtnSave').addEventListener('click', savePage);
  }

  // Clean DOM and Save Page to Server
  async function savePage() {
    const saveBtn = document.getElementById('cbsBtnSave');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = 'Saving &amp; Backing Up...';

    try {
      // Clone root document to serialize clean HTML
      const cloneDoc = document.documentElement.cloneNode(true);

      // 1. Remove editor elements from clone
      const editorElements = cloneDoc.querySelectorAll('[data-cbs-editor]');
      editorElements.forEach(el => el.remove());

      // 2. Unwrap any cbs-image-wrapper elements
      const wrappers = cloneDoc.querySelectorAll('[data-cbs-editor-wrapper]');
      wrappers.forEach(w => {
        const img = w.querySelector('img');
        if (img && w.parentNode) {
          w.parentNode.insertBefore(img, w);
        }
        w.remove();
      });

      // 3. Remove runtime editor attributes and classes
      cloneDoc.classList.remove('cbs-editor-active', 'cbs-mode-edit', 'cbs-mode-preview');
      const cloneBody = cloneDoc.querySelector('body');
      if (cloneBody) {
        cloneBody.classList.remove('cbs-editor-active', 'cbs-mode-edit', 'cbs-mode-preview');
      }

      const editables = cloneDoc.querySelectorAll('[data-cbs-editable]');
      editables.forEach(el => {
        el.removeAttribute('data-cbs-editable');
        el.removeAttribute('contenteditable');
      });

      // 4. Remove injected script / link tags for the editor from saved output
      const editorInjected = cloneDoc.querySelectorAll('link[href*="visual-editor"], script[src*="visual-editor"]');
      editorInjected.forEach(el => el.remove());

      const cleanHtml = '<!DOCTYPE html>\n' + cloneDoc.outerHTML;

      const res = await fetch('/api/editor/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: pageName,
          htmlContent: cleanHtml
        })
      });

      const data = await res.json();
      if (data.success) {
        setDirty(false);
        showToast(`Page published! Version backup: ${data.backupCreated || 'Created'}`);
      } else {
        showToast('Error saving: ' + (data.error || 'Server rejected save'), false);
      }
    } catch (err) {
      console.error('Save page error:', err);
      showToast('Network error while saving page: ' + err.message, false);
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalText;
    }
  }

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditorUI);
  } else {
    initEditorUI();
  }
})();
