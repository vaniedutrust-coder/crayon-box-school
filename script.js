/**
 * CRAYON BOX SCHOOL — INTERACTIVE SCRIPT
 * Handles mobile drawer, time-of-day tabs, modals, and smooth scroll interactions
 */

function initCrayonBoxApp() {

  /* ==========================================================================
     1. MOBILE DRAWER NAVIGATION
     ========================================================================== */
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const mobileDrawer = document.getElementById('mobileDrawer');
  const mobileLinks = document.querySelectorAll('.mobile-link');

  if (mobileMenuBtn && mobileDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      const isOpen = mobileDrawer.classList.toggle('open');
      mobileMenuBtn.setAttribute('aria-expanded', isOpen);
    });

    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileDrawer.classList.remove('open');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ==========================================================================
     2. SECTION 04: DAILY RHYTHM TABS
     ========================================================================== */
  const dayTabs = document.querySelectorAll('.day-tab-btn');
  const dayPanels = document.querySelectorAll('.day-panel');

  dayTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');

      // Update active tab buttons
      dayTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update visible panel
      dayPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `panel-${targetTab}`) {
          panel.classList.add('active');
        }
      });
    });
  });

  /* ==========================================================================
     3. MODAL DIALOGS (TOUR BOOKING & ENQUIRY)
     ========================================================================== */
  const tourModal = document.getElementById('tourModal');
  const enquiryModal = document.getElementById('enquiryModal');
  const tourButtons = document.querySelectorAll('.open-tour-modal');
  const enquiryButtons = document.querySelectorAll('.open-enquiry-modal');
  const closeButtons = document.querySelectorAll('.modal-close');
  const allModals = document.querySelectorAll('.modal-backdrop');

  // Open Tour Modal
  tourButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(tourModal);
    });
  });

  // Open Enquiry Modal
  enquiryButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(enquiryModal);
    });
  });

  // Stage button contextual click in Journey section
  const stageButtons = document.querySelectorAll('.stage-btn[data-stage], .stage-pill-btn[data-stage]');
  stageButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const stage = btn.getAttribute('data-stage');
      const gradeSelect = document.getElementById('tourChildGrade');
      if (gradeSelect) {
        if (stage === 'kindergarten') gradeSelect.value = 'Kindergarten';
        if (stage === 'primary') gradeSelect.value = 'Primary (1-3)';
        if (stage === 'middle') gradeSelect.value = 'Middle School (6-8)';
      }
      openModal(tourModal);
    });
  });

  // Testimonial slider navigation
  const prevStoryBtn = document.querySelector('.prev-btn');
  const nextStoryBtn = document.querySelector('.next-btn');
  const storiesGrid = document.querySelector('.stories-grid');

  if (prevStoryBtn && nextStoryBtn && storiesGrid) {
    prevStoryBtn.addEventListener('click', () => {
      storiesGrid.scrollBy({ left: -320, behavior: 'smooth' });
    });
    nextStoryBtn.addEventListener('click', () => {
      storiesGrid.scrollBy({ left: 320, behavior: 'smooth' });
    });
  }

  // Close modals
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });

  allModals.forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeAllModals();
      }
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAllModals();
    }
  });

  function openModal(modal) {
    closeAllModals();
    if (modal) {
      modal.classList.add('open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }
  }

  function closeAllModals() {
    allModals.forEach(m => {
      m.classList.remove('open');
      m.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = '';
  }

  /* ==========================================================================
     4. FORM SUBMISSION DEMO FEEDBACK
     ========================================================================== */
  const tourForm = document.getElementById('tourForm');
  const tourSuccess = document.getElementById('tourSuccess');
  if (tourForm && tourSuccess) {
    tourForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = tourForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.innerHTML = 'Reserving Slot...'; submitBtn.disabled = true; }

      const parentName = document.getElementById('tourParentName')?.value || 'Parent';
      const phone = document.getElementById('tourPhone')?.value || '';
      const email = document.getElementById('tourEmail')?.value || '';
      const grade = document.getElementById('tourChildGrade')?.value || 'Kindergarten';
      const date = document.getElementById('tourDate')?.value || new Date().toISOString().split('T')[0];
      const timeSlot = document.getElementById('tourTime')?.value || 'Morning 10:00 AM';

      try {
        const res = await fetch('/api/tours/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentName, phone, email, grade, date, timeSlot, attendees: 2 })
        });
        const d = await res.json();
        if (d.success) {
          tourSuccess.innerHTML = `
            <div style="text-align: center; padding: 16px;">
              <h4 style="color: #2E7D32; font-size: 1.15rem; margin-bottom: 6px;">&#10004; Walkthrough Confirmed!</h4>
              <p style="font-size: 0.9rem; color: var(--navy); margin-bottom: 4px;">Booking Ref: <strong>${d.bookingRef}</strong></p>
              <p style="font-size: 0.8rem; color: var(--text-muted);">We look forward to welcoming your family on ${date}.</p>
            </div>
          `;
          tourSuccess.classList.add('show');
          tourForm.reset();
          setTimeout(() => {
            tourSuccess.classList.remove('show');
            closeAllModals();
            if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
          }, 4000);
        }
      } catch (err) {
        console.error(err);
        if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
      }
    });
  }

  const enquiryForm = document.getElementById('enquiryForm');
  const enquirySuccess = document.getElementById('enquirySuccess');
  if (enquiryForm && enquirySuccess) {
    enquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = enquiryForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.innerHTML = 'Submitting Enquiry...'; submitBtn.disabled = true; }

      const parentName = document.getElementById('enquiryParentName')?.value || document.getElementById('enquiryParent')?.value || 'Parent';
      const studentName = document.getElementById('enquiryStudentName')?.value || document.getElementById('enquiryStudent')?.value || 'Student';
      const phone = document.getElementById('enquiryPhone')?.value || '';
      const email = document.getElementById('enquiryEmail')?.value || 'info@crayonboxschool.com';
      const grade = document.getElementById('enquiryGrade')?.value || 'Kindergarten';

      try {
        const res = await fetch('/api/admissions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentName, studentName, phone, email, grade })
        });
        const d = await res.json();
        if (d.success) {
          enquirySuccess.innerHTML = `
            <div style="text-align: center; padding: 16px;">
              <h4 style="color: #2E7D32; font-size: 1.15rem; margin-bottom: 6px;">&#10004; Enquiry Submitted!</h4>
              <p style="font-size: 0.9rem; color: var(--navy); margin-bottom: 4px;">Application Ref: <strong>${d.appNo}</strong></p>
              <p style="font-size: 0.8rem; color: var(--text-muted);">Our admissions counselor will contact you within 24 hours.</p>
            </div>
          `;
          enquirySuccess.classList.add('show');
          enquiryForm.reset();
          setTimeout(() => {
            enquirySuccess.classList.remove('show');
            closeAllModals();
            if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
          }, 4000);
        }
      } catch (err) {
        console.error(err);
        if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
      }
    });
  }

  /* ==========================================================================
     5. SCROLL INTERSECTION OBSERVER FOR FADE-IN
     ========================================================================== */
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    const animatedElements = document.querySelectorAll(
      '.stage-card, .diff-feature-item, .life-card, .kg-spotlight-card, .k12-vision-card, .campus-panoramic-card, .campus-pillar-card, .story-card, .step-card, .fee-card, .docs-advisory-card, .location-banner-card, .campus-metric-card, .campus-safety-card, .transit-route-card, .fac-feat-item, .campus-visit-card'
    );
    animatedElements.forEach(el => observer.observe(el));
  }

  /* ==========================================================================
     6. ADMISSIONS PAGE: FAQ ACCORDION
     ========================================================================== */
  const faqQuestions = document.querySelectorAll('.faq-question');
  faqQuestions.forEach(btn => {
    btn.addEventListener('click', () => {
      const parentItem = btn.closest('.faq-item');
      if (!parentItem) return;
      const isOpen = parentItem.classList.contains('active');

      // Close all other items
      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('active');
        const qBtn = item.querySelector('.faq-question');
        if (qBtn) qBtn.setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        parentItem.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ==========================================================================
     7. ADMISSIONS PAGE: QUICK AGE ELIGIBILITY CHECKER
     ========================================================================== */
  const btnCheckEligibility = document.getElementById('btnCheckEligibility');
  const checkBirthMonth = document.getElementById('checkBirthMonth');
  const checkBirthYear = document.getElementById('checkBirthYear');
  const checkerResult = document.getElementById('checkerResult');
  const resultGradeBadge = document.getElementById('resultGradeBadge');
  const resultText = document.getElementById('resultText');

  if (btnCheckEligibility && checkBirthMonth && checkBirthYear && checkerResult) {
    btnCheckEligibility.addEventListener('click', () => {
      const birthMonth = parseInt(checkBirthMonth.value, 10); // 0 = Jan, 11 = Dec
      const birthYear = parseInt(checkBirthYear.value, 10);

      // Delhi DoE Cutoff: 31st March 2026
      // Calculate age in months as of March 31, 2026
      const ageInMonths = (2026 - birthYear) * 12 + (2 - birthMonth);
      const ageYears = Math.floor(ageInMonths / 12);
      const ageRemainingMonths = Math.max(0, ageInMonths % 12);

      let gradeTitle = '';
      let gradeDesc = '';

      if (ageInMonths < 36) {
        gradeTitle = 'Toddler / Early Explorers';
        gradeDesc = `Child will be ${ageYears} yrs ${ageRemainingMonths} mos as of 31 March 2026. Eligible for Playgroup or Session 2027–28 Nursery.`;
      } else if (ageInMonths >= 36 && ageInMonths < 48) {
        gradeTitle = 'Pre-School / Nursery (Ages 3+)';
        gradeDesc = 'Eligible for Nursery for Academic Session 2026–27! Aligned with Delhi DoE age guidelines.';
      } else if (ageInMonths >= 48 && ageInMonths < 60) {
        gradeTitle = 'Pre-Primary / KG (Ages 4+)';
        gradeDesc = 'Eligible for Kindergarten (KG) for Academic Session 2026–27!';
      } else if (ageInMonths >= 60 && ageInMonths < 72) {
        gradeTitle = 'Class 1 (Primary Years, Ages 5–6)';
        gradeDesc = 'Eligible for Class 1 (Primary School) for Academic Session 2026–27!';
      } else if (ageInMonths >= 72 && ageInMonths < 84) {
        gradeTitle = 'Class 2';
        gradeDesc = 'Eligible for Class 2 admission for Session 2026–27 (with previous grade marksheet).';
      } else if (ageInMonths >= 84 && ageInMonths < 96) {
        gradeTitle = 'Class 3';
        gradeDesc = 'Eligible for Class 3 admission for Session 2026–27.';
      } else if (ageInMonths >= 96 && ageInMonths < 108) {
        gradeTitle = 'Class 4';
        gradeDesc = 'Eligible for Class 4 admission for Session 2026–27.';
      } else if (ageInMonths >= 108 && ageInMonths < 120) {
        gradeTitle = 'Class 5';
        gradeDesc = 'Eligible for Class 5 admission for Session 2026–27.';
      } else if (ageInMonths >= 120 && ageInMonths < 132) {
        gradeTitle = 'Class 6 (Middle School)';
        gradeDesc = 'Eligible for Class 6 (Middle School) for Session 2026–27.';
      } else if (ageInMonths >= 132 && ageInMonths < 144) {
        gradeTitle = 'Class 7 (Middle School)';
        gradeDesc = 'Eligible for Class 7 for Session 2026–27.';
      } else if (ageInMonths >= 144 && ageInMonths < 168) {
        gradeTitle = 'Class 8 (Middle School)';
        gradeDesc = 'Eligible for Class 8 for Session 2026–27.';
      } else {
        gradeTitle = 'Senior Horizon (Classes 9+)';
        gradeDesc = 'Eligible for Senior School consultation as Crayon Box expands its K–12 vision.';
      }

      resultGradeBadge.textContent = gradeTitle;
      resultText.textContent = gradeDesc;
      checkerResult.style.display = 'block';

      // Auto-populate target grade dropdown in the application form
      const targetGradeSelect = document.getElementById('admTargetGrade');
      if (targetGradeSelect) {
        if (gradeTitle.includes('Nursery')) targetGradeSelect.value = 'Nursery';
        else if (gradeTitle.includes('KG')) targetGradeSelect.value = 'KG';
        else if (gradeTitle.includes('Class 1')) targetGradeSelect.value = 'Class 1';
        else if (gradeTitle.includes('Class 2')) targetGradeSelect.value = 'Class 2';
        else if (gradeTitle.includes('Class 3')) targetGradeSelect.value = 'Class 3';
        else if (gradeTitle.includes('Class 4')) targetGradeSelect.value = 'Class 4';
        else if (gradeTitle.includes('Class 5')) targetGradeSelect.value = 'Class 5';
        else if (gradeTitle.includes('Class 6')) targetGradeSelect.value = 'Class 6';
        else if (gradeTitle.includes('Class 7')) targetGradeSelect.value = 'Class 7';
        else if (gradeTitle.includes('Class 8')) targetGradeSelect.value = 'Class 8';
      }
    });
  }

  /* ==========================================================================
     8. ADMISSIONS PAGE: MAIN REGISTRATION FORM
     ========================================================================== */
  const mainAdmissionForm = document.getElementById('mainAdmissionForm');
  const mainAdmissionSuccess = document.getElementById('mainAdmissionSuccess');

  if (mainAdmissionForm && mainAdmissionSuccess) {
    mainAdmissionForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = mainAdmissionForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.innerHTML = 'Submitting Application...'; submitBtn.disabled = true; }

      const payload = {
        parentName: document.getElementById('admParentName')?.value || '',
        phone: document.getElementById('admPhone')?.value || '',
        email: document.getElementById('admEmail')?.value || '',
        locality: document.getElementById('admLocality')?.value || '',
        studentName: document.getElementById('admChildName')?.value || '',
        dob: document.getElementById('admDOB')?.value || '',
        grade: document.getElementById('admTargetGrade')?.value || 'Grade 1',
        previousSchool: document.getElementById('admPrevSchool')?.value || '',
        notes: document.getElementById('admSpecialNeeds')?.value || ''
      };

      try {
        const res = await fetch('/api/admissions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
          mainAdmissionForm.style.display = 'none';
          const p = mainAdmissionSuccess.querySelector('p');
          if (p) {
            p.innerHTML = `Thank you for choosing Crayon Box School! Your official registration reference is <strong style="color:var(--navy); font-size:1.1rem; background:#FFF8E1; padding:2px 8px; border-radius:4px; border:1px solid #FFE082;">${d.appNo}</strong>. Our admissions coordinator will contact you via WhatsApp &amp; phone within 24 hours.`;
          }
          mainAdmissionSuccess.classList.add('show');
          mainAdmissionSuccess.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } catch (err) {
        console.error(err);
        if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
      }
    });
  }

  /* 8B. ADMISSIONS PAGE: FAST INQUIRY CARD */
  const quickInquiryForm = document.getElementById('quickInquiryForm');
  const quickInquirySuccess = document.getElementById('quickInquirySuccess');
  if (quickInquiryForm && quickInquirySuccess) {
    quickInquiryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = quickInquiryForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) { submitBtn.innerHTML = 'Sending...'; submitBtn.disabled = true; }

      const parentName = document.getElementById('quickParentName')?.value || 'Parent';
      const phone = document.getElementById('quickPhone')?.value || '';
      const grade = document.getElementById('quickGrade')?.value || 'Nursery';

      try {
        const res = await fetch('/api/admissions/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ parentName, studentName: 'Applicant', phone, grade, notes: 'Fast callback request via Admissions quick-inquiry card' })
        });
        const d = await res.json();
        if (d.success) {
          quickInquirySuccess.innerHTML = `✅ Thank you, ${parentName}! Your inquiry (Ref: <strong>${d.appNo}</strong>) has been registered. Our admissions coordinator will contact you via WhatsApp &amp; phone within 24 hours.`;
          quickInquirySuccess.style.display = 'block';
          quickInquiryForm.reset();
        } else {
          quickInquirySuccess.innerHTML = `⚠️ ${d.error || 'Failed to submit inquiry. Please call +91 98111 02008.'}`;
          quickInquirySuccess.style.display = 'block';
        }
      } catch (err) {
        console.error(err);
        quickInquirySuccess.innerHTML = '⚠️ Error connecting to admissions server. Please call us directly at +91 98111 02008.';
        quickInquirySuccess.style.display = 'block';
      } finally {
        if (submitBtn) { submitBtn.innerHTML = origText; submitBtn.disabled = false; }
      }
    });
  }

  /* ==========================================================================
     9. ORIGINKIT ANIMATION 1: SHINE CARD & 3D PERSPECTIVE TILT
     Tracks mouse on stage cards, step cards, fee pillars, campus pillars, faculty & contact cards
     ========================================================================== */
  const shineCards = document.querySelectorAll(
    '.shine-card, .stage-card, .step-card, .fee-card, .campus-pillar-card, .age-checker-card, .leader-card, .pillar-card, .faculty-card, .board-member-card, .cred-card, .department-card, .route-guide-card, .contact-ribbon-card, .walkthrough-step, .fleet-feature-card, .faq-guide-card, .zone-card, .dir-card, .safety-pillar-card'
  );

  shineCards.forEach(card => {
    card.addEventListener('mousemove', (e) => {
      // Guard: only execute on desktop/pointer devices with hover capability to prevent stuck cards on touch screens
      if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Subtle tilt: max 4.5 degrees
      const rotateX = (((y - centerY) / centerY) * -4.5).toFixed(2);
      const rotateY = (((x - centerX) / centerX) * 4.5).toFixed(2);

      card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
      card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      card.style.transition = 'none'; // Instant 60fps tracking without interpolation lag
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease';
      card.style.transform = '';
    });
  });

  /* ==========================================================================
     10. ORIGINKIT ANIMATION 2: BUBBLE BURST CLICK PARTICLES
     Joyful celebratory pastel bubbles upon interactive milestone clicks
     ========================================================================== */
  const bubblePalette = ['#E66A23', '#E5A91E', '#2E8B57', '#1E60B5', '#C41E66'];

  function createBubbleBurst(x, y) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    // Viewport-safe coordinates
    const safeX = Math.max(16, Math.min(window.innerWidth - 16, x));
    const safeY = Math.max(16, Math.min(window.innerHeight - 16, y));

    const bubbleCount = 8;
    for (let i = 0; i < bubbleCount; i++) {
      const bubble = document.createElement('span');
      bubble.className = 'bubble-particle';

      const size = Math.floor(Math.random() * 12) + 10; // 10px to 22px
      const angle = (Math.PI * 2 / bubbleCount) * i + (Math.random() * 0.4 - 0.2);
      const distance = Math.floor(Math.random() * 40) + 35; // 35px to 75px
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance;

      const color = bubblePalette[i % bubblePalette.length];

      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${safeX}px`;
      bubble.style.top = `${safeY}px`;
      bubble.style.backgroundColor = color;
      bubble.style.boxShadow = `0 2px 8px ${color}66`;
      bubble.style.setProperty('--dx', `${dx}px`);
      bubble.style.setProperty('--dy', `${dy}px`);

      document.body.appendChild(bubble);

      setTimeout(() => {
        bubble.remove();
      }, 700);
    }
  }

  // Document-level event delegation ensures dynamically created or deep child elements trigger reliably
  const bubbleClickSelector = '#btnCheckEligibility, .btn-primary, .btn-gold, .btn-green-whatsapp, .day-tab-btn, .facility-tab-btn, .subject-tab-btn, .faculty-tab-btn, .map-size-btn, .open-tour-modal, .open-360-modal, .btn-hero, .btn-outline, .diff-feature-item';
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest(bubbleClickSelector);
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const x = (e.clientX && e.clientX > 0) ? e.clientX : (rect.left + rect.width / 2);
    const y = (e.clientY && e.clientY > 0) ? e.clientY : (rect.top + rect.height / 2);
    createBubbleBurst(x, y);
  });

  /* ==========================================================================
     11. ORIGINKIT ANIMATION 3: SCROLL TEXT HIGHLIGHT & DRY BRUSH REVEAL
     Sweeps organic crayon highlighter and brush wipe into view
     ========================================================================== */
  const highlightEls = document.querySelectorAll('.highlight-crayon, .dry-brush-frame');
  if ('IntersectionObserver' in window) {
    const highlightObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    highlightEls.forEach(el => {
      highlightObserver.observe(el);
      // Immediately trigger if already in viewport on load, with slight delay to ensure transition animates visibly
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setTimeout(() => {
          el.classList.add('in-view');
        }, 120);
      }
    });
  } else {
    highlightEls.forEach(el => el.classList.add('in-view'));
  }

  /* ==========================================================================
     12. GOOGLE MAPS INTERACTIVE VIEW SWITCHER
     Toggles between Live Google Map and 3-Acre Campus Photo View
     ========================================================================== */
  const mapTabBtns = document.querySelectorAll('.map-tab-btn');
  const mapViewMap = document.getElementById('mapViewMap');
  const mapViewPhoto = document.getElementById('mapViewPhoto');
  const mapViewTour360 = document.getElementById('mapViewTour360');

  mapTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetView = btn.getAttribute('data-view');
      mapTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (mapViewMap) mapViewMap.classList.toggle('active', targetView === 'map');
      if (mapViewPhoto) mapViewPhoto.classList.toggle('active', targetView === 'photo');
      if (mapViewTour360) mapViewTour360.classList.toggle('active', targetView === 'tour360');
    });
  });

  /* ==========================================================================
     13. ACADEMICS PAGE: SUBJECT HORIZONS TABS SWITCHER
     ========================================================================== */
  const subjectTabBtns = document.querySelectorAll('.subject-tab-btn');
  const subjectPanels = document.querySelectorAll('.subject-panel');

  subjectTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSubject = btn.getAttribute('data-subject');
      subjectTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      subjectPanels.forEach(panel => {
        if (panel.id === targetSubject) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  /* ==========================================================================
     14. CAMPUS PAGE: 5-ZONE FACILITY EXPLORER TABS SWITCHER
     ========================================================================== */
  const facilityTabBtns = document.querySelectorAll('.facility-tab-btn');
  const facilityPanels = document.querySelectorAll('.facility-panel');

  facilityTabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetZone = btn.getAttribute('data-zone');
      facilityTabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      facilityPanels.forEach(panel => {
        if (panel.id === targetZone) {
          panel.classList.add('active');
        } else {
          panel.classList.remove('active');
        }
      });
    });
  });

  // Campus Tour Form Submission
  const campusTourForm = document.getElementById('campusTourForm');
  if (campusTourForm) {
    campusTourForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = campusTourForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = '&#10003; Walkthrough Request Received!';
        submitBtn.style.backgroundColor = '#2E8B57';
        submitBtn.style.color = '#FFFFFF';
      }
      setTimeout(() => {
        campusTourForm.reset();
        if (submitBtn) {
          submitBtn.innerHTML = originalText;
          submitBtn.style.backgroundColor = '';
          submitBtn.style.color = '';
        }
        closeAllModals();
      }, 2500);
    });
  }

  /* ==========================================================================
     15. IN-PAGE 360° TOUR MODAL & FULLSCREEN HANDLERS
     ========================================================================== */
  const tour360Modal = document.getElementById('tour360Modal');
  const open360Btns = document.querySelectorAll('.open-360-modal');
  const modal360Iframe = document.getElementById('modal360Iframe');

  open360Btns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (modal360Iframe && (!modal360Iframe.src || modal360Iframe.src === 'about:blank' || modal360Iframe.src === window.location.href)) {
        modal360Iframe.src = modal360Iframe.getAttribute('data-src');
      }
      openModal(tour360Modal);
    });
  });

  // Direct 360 Viewer Fullscreen Expansion
  const btnToggle360Fullscreen = document.getElementById('btnToggle360Fullscreen');
  const direct360FrameWrap = document.getElementById('direct360FrameWrap');

  if (btnToggle360Fullscreen && direct360FrameWrap) {
    btnToggle360Fullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        if (direct360FrameWrap.requestFullscreen) {
          direct360FrameWrap.requestFullscreen().catch(() => {
            direct360FrameWrap.classList.toggle('is-fullscreen');
          });
        } else {
          direct360FrameWrap.classList.toggle('is-fullscreen');
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
    });

    document.addEventListener('fullscreenchange', () => {
      if (document.fullscreenElement === direct360FrameWrap) {
        btnToggle360Fullscreen.innerHTML = '<span>&#x2715;</span> Exit Fullscreen';
      } else {
        btnToggle360Fullscreen.innerHTML = '<span>&#x26F6;</span> Expand Fullscreen';
      }
    });
  }

  /* ==========================================================================
     16. ABOUT & FACULTY PAGE: FACULTY DEPARTMENT FILTER
     ========================================================================== */
  const facultyTabBtns = document.querySelectorAll('.faculty-tab-btn');
  const facultyCards = document.querySelectorAll('.faculty-card');

  if (facultyTabBtns.length > 0 && facultyCards.length > 0) {
    facultyTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dept = btn.getAttribute('data-dept');
        facultyTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        facultyCards.forEach(card => {
          const cardDept = card.getAttribute('data-dept');
          if (dept === 'all' || cardDept === dept) {
            card.style.display = '';
            card.classList.add('in-view');
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  /* ==========================================================================
     17. CONTACT PAGE: INTERACTIVE GOOGLE MAP SIZE SWITCHER
     ========================================================================== */
  const mapSizeBtns = document.querySelectorAll('.map-size-btn');
  const contactMapBox = document.getElementById('contactMapBox');

  if (mapSizeBtns.length > 0 && contactMapBox) {
    mapSizeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        mapSizeBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        contactMapBox.classList.remove('mode-large', 'mode-compact');
        if (mode === 'large') {
          contactMapBox.classList.add('mode-large');
        } else if (mode === 'compact') {
          contactMapBox.classList.add('mode-compact');
        }
      });
    });
  }

  /* ==========================================================================
     18. CONTACT PAGE: IN-PAGE VISIT BOOKING FORM HANDLER
     ========================================================================== */
  const inPageBookingForm = document.getElementById('inPageBookingForm');
  const inPageBookingSuccess = document.getElementById('inPageBookingSuccess');

  if (inPageBookingForm) {
    inPageBookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = inPageBookingForm.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.innerHTML : 'Confirm Campus Walkthrough &rarr;';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Booking slot...';
      }

      const payload = {
        parentName: document.getElementById('bookParentName')?.value || '',
        phone: document.getElementById('bookPhone')?.value || '',
        email: document.getElementById('bookEmail')?.value || '',
        grade: document.getElementById('bookGrade')?.value || '',
        date: document.getElementById('bookDate')?.value || '',
        timeSlot: document.getElementById('bookTimeSlot')?.value || '',
        notes: document.getElementById('bookInterests')?.value || '',
        attendees: 2
      };

      try {
        const res = await fetch('/api/tours/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
          if (submitBtn) {
            submitBtn.innerHTML = '&#10004; Tour Request Confirmed!';
            submitBtn.style.backgroundColor = '#166534';
          }
          if (inPageBookingSuccess) {
            inPageBookingSuccess.innerHTML = `&#10004; <strong>Tour Scheduled!</strong> Booking Ref: <strong>${d.bookingRef || 'CONFIRMED'}</strong>. An admissions coordinator has reserved your slot and will call you with visitor pass details.`;
            inPageBookingSuccess.style.display = 'block';
          }
          inPageBookingForm.reset();
        } else {
          alert('Submission error: ' + (d.error || 'Please check your inputs'));
        }
      } catch (err) {
        console.error('Tour booking error:', err);
        alert('Server connection error. Please try again or call admissions directly.');
      } finally {
        setTimeout(() => {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            submitBtn.style.backgroundColor = '';
          }
        }, 6000);
      }
    });
  }

  /* ==========================================================================
     19. PARENT PORTAL & ERP HUB INTERACTIONS
     ========================================================================== */
  const erpModal = document.getElementById('erpModal');
  const openErpBtns = document.querySelectorAll('.open-erp-modal');
  const erpLoginForm = document.getElementById('erpLoginForm');
  const erpToast = document.getElementById('erpToast');
  const erpTabBtns = document.querySelectorAll('.erp-tab-btn');
  const erpTabPanels = document.querySelectorAll('.erp-tab-panel');
  const docDownloadBtns = document.querySelectorAll('.btn-download-doc');

  function showToast(msg, isSuccess = true) {
    if (!erpToast) return;
    erpToast.innerHTML = (isSuccess ? '&#10004; ' : '&#9888; ') + msg;
    erpToast.style.backgroundColor = isSuccess ? '#166534' : '#C62828';
    erpToast.classList.add('show');
    setTimeout(() => {
      erpToast.classList.remove('show');
    }, 4000);
  }

  // Open ERP Modal
  openErpBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(erpModal);
    });
  });

  // ERP Login Tabs
  if (erpTabBtns.length > 0) {
    erpTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        erpTabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        erpTabPanels.forEach(panel => {
          if (panel.id === `erpPanel-${mode}`) {
            panel.style.display = 'block';
          } else {
            panel.style.display = 'none';
          }
        });
      });
    });
  }

  // ERP Form Submission
  if (erpLoginForm) {
    erpLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = erpLoginForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = 'Connecting to Secure Server...';
        submitBtn.disabled = true;
      }
      setTimeout(() => {
        if (submitBtn) {
          submitBtn.innerHTML = '&#10004; Authenticated!';
          submitBtn.style.backgroundColor = '#166534';
        }
        showToast('Secure Session Initialized! Redirecting to Parent Dashboard...');
        setTimeout(() => {
          erpLoginForm.reset();
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.style.backgroundColor = '';
            submitBtn.disabled = false;
          }
          closeAllModals();
        }, 1800);
      }, 1200);
    });
  }

  // Document Download Click Toast Feedback
  docDownloadBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const docName = btn.getAttribute('data-doc') || 'Document';
      showToast(`Downloading: ${docName} (Official PDF)`);
    });
  });

  /* ==========================================================================
     20. GALLERY FILTERING & FULLSCREEN LIGHTBOX
     ========================================================================== */
  const galleryFilterBtns = document.querySelectorAll('.gallery-filter-btn');
  const galleryCards = document.querySelectorAll('.gallery-card');
  const lightboxModal = document.getElementById('lightboxModal');
  const lightboxImg = document.getElementById('lightboxImg');
  const lightboxTitle = document.getElementById('lightboxTitle');
  const lightboxCaption = document.getElementById('lightboxCaption');
  const lightboxBadge = document.getElementById('lightboxBadge');
  const lightboxCounter = document.getElementById('lightboxCounter');
  const lightboxPrevBtn = document.getElementById('lightboxPrev');
  const lightboxNextBtn = document.getElementById('lightboxNext');

  let visibleGalleryItems = [];
  let currentLightboxIndex = 0;

  function updateVisibleGallery() {
    visibleGalleryItems = Array.from(galleryCards).filter(c => c.style.display !== 'none');
  }

  // Filter Buttons
  if (galleryFilterBtns.length > 0 && galleryCards.length > 0) {
    galleryFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-filter');
        galleryFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        galleryCards.forEach(card => {
          const cardCat = card.getAttribute('data-category');
          if (cat === 'all' || cardCat === cat) {
            card.style.display = '';
            card.classList.add('in-view');
          } else {
            card.style.display = 'none';
          }
        });
        updateVisibleGallery();
      });
    });
    updateVisibleGallery();
  }

  function showLightboxIndex(index) {
    if (visibleGalleryItems.length === 0) return;
    if (index < 0) index = visibleGalleryItems.length - 1;
    if (index >= visibleGalleryItems.length) index = 0;
    currentLightboxIndex = index;

    const item = visibleGalleryItems[index];
    const imgEl = item.querySelector('.gallery-card-img');
    const titleEl = item.querySelector('.gallery-card-title');
    const catEl = item.querySelector('.gallery-card-badge');
    const captionEl = item.querySelector('.gallery-card-caption');

    if (lightboxImg && imgEl) {
      lightboxImg.src = imgEl.src;
      lightboxImg.alt = imgEl.alt || 'Gallery photo';
    }
    if (lightboxTitle && titleEl) lightboxTitle.textContent = titleEl.textContent;
    if (lightboxBadge && catEl) lightboxBadge.textContent = catEl.textContent;
    if (lightboxCaption && captionEl) lightboxCaption.textContent = captionEl.textContent;
    if (lightboxCounter) lightboxCounter.textContent = `${index + 1} / ${visibleGalleryItems.length}`;
  }

  // Open Lightbox on Card Click or Zoom Trigger
  galleryCards.forEach(card => {
    card.addEventListener('click', () => {
      updateVisibleGallery();
      const idx = visibleGalleryItems.indexOf(card);
      if (idx !== -1) {
        showLightboxIndex(idx);
        openModal(lightboxModal);
      }
    });
  });

  if (lightboxPrevBtn) {
    lightboxPrevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxIndex(currentLightboxIndex - 1);
    });
  }

  if (lightboxNextBtn) {
    lightboxNextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showLightboxIndex(currentLightboxIndex + 1);
    });
  }

  // Keyboard navigation for Lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightboxModal || !lightboxModal.classList.contains('open')) return;
    if (e.key === 'ArrowLeft') showLightboxIndex(currentLightboxIndex - 1);
    if (e.key === 'ArrowRight') showLightboxIndex(currentLightboxIndex + 1);
  });

  /* ==========================================================================
     21. CAREERS PAGE: VACANCY FILTERING & APPLICATION SUBMISSION
     ========================================================================== */
  const openingFilterBtns = document.querySelectorAll('.opening-filter-btn');
  const vacancyCards = document.querySelectorAll('.vacancy-card');
  const applyRoleBtns = document.querySelectorAll('.btn-apply-role');
  const applyRoleSelect = document.getElementById('applyRole');
  const facultyApplicationForm = document.getElementById('facultyApplicationForm');
  const resumeFileInput = document.getElementById('resumeFile');
  const resumeFileText = document.getElementById('resumeFileText');
  const careerToast = document.getElementById('careerToast');

  function showCareerToast(msg, isSuccess = true) {
    if (!careerToast) return;
    careerToast.innerHTML = (isSuccess ? '&#10004; ' : '&#9888; ') + msg;
    careerToast.style.backgroundColor = isSuccess ? '#166534' : '#C62828';
    careerToast.classList.add('show');
    setTimeout(() => {
      careerToast.classList.remove('show');
    }, 4500);
  }

  // Vacancy Filter
  if (openingFilterBtns.length > 0 && vacancyCards.length > 0) {
    openingFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dept = btn.getAttribute('data-dept') || btn.getAttribute('data-filter') || 'all';
        openingFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        vacancyCards.forEach(card => {
          const cardDept = card.getAttribute('data-dept') || card.getAttribute('data-category') || '';
          if (dept === 'all' || cardDept === dept) {
            card.style.display = '';
            card.classList.add('in-view');
          } else {
            card.style.display = 'none';
          }
        });
      });
    });
  }

  // Apply Role Quick Button
  applyRoleBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const role = btn.getAttribute('data-role');
      if (applyRoleSelect && role) {
        applyRoleSelect.value = role;
      }
      const formEl = document.getElementById('apply-form');
      if (formEl) {
        formEl.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Resume file name feedback
  if (resumeFileInput && resumeFileText) {
    resumeFileInput.addEventListener('change', () => {
      if (resumeFileInput.files.length > 0) {
        resumeFileText.innerHTML = `<strong>Selected:</strong> ${resumeFileInput.files[0].name}`;
      }
    });
  }

  // Form submission
  if (facultyApplicationForm) {
    facultyApplicationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = facultyApplicationForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = 'Uploading Application &amp; Resume...';
        submitBtn.disabled = true;
      }

      try {
        let resumeBase64 = null;
        let resumeFilename = null;
        if (resumeFileInput && resumeFileInput.files.length > 0) {
          const file = resumeFileInput.files[0];
          resumeFilename = file.name;
          resumeBase64 = await new Promise((res, rej) => {
            const reader = new FileReader();
            reader.onload = () => res(reader.result);
            reader.onerror = rej;
            reader.readAsDataURL(file);
          });
        }

        const payload = {
          candidateName: document.getElementById('applicantName')?.value || '',
          email: document.getElementById('applicantEmail')?.value || '',
          phone: document.getElementById('applicantPhone')?.value || '',
          position: document.getElementById('applyRole')?.value || '',
          qualification: document.getElementById('highestQualification')?.value || '',
          experience: document.getElementById('teachingExperience')?.value || '0',
          coverNote: document.getElementById('teachingPhilosophy')?.value || '',
          resumeBase64,
          resumeFilename
        };

        const res = await fetch('/api/careers/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          if (submitBtn) {
            submitBtn.innerHTML = `&#10004; Applied (${data.appId})!`;
            submitBtn.style.backgroundColor = '#166534';
          }
          showCareerToast(`Application Submitted! Ref ID: ${data.appId}. Our HR team will review your profile and reach out within 48 hours.`);
          setTimeout(() => {
            facultyApplicationForm.reset();
            if (resumeFileText) {
              resumeFileText.innerHTML = 'Click to select Resume / CV (PDF or DOCX, max 5MB)';
            }
            if (submitBtn) {
              submitBtn.innerHTML = origText;
              submitBtn.style.backgroundColor = '';
              submitBtn.disabled = false;
            }
          }, 4000);
        } else {
          alert(data.error || 'Submission error');
          if (submitBtn) {
            submitBtn.innerHTML = origText;
            submitBtn.disabled = false;
          }
        }
      } catch (err) {
        console.error(err);
        showCareerToast('Network error while submitting application. Please try again.', false);
        if (submitBtn) {
          submitBtn.innerHTML = origText;
          submitBtn.disabled = false;
        }
      }
    });
  }

  /* ==========================================================================
     SECTION 22 — CBSE MANDATORY PUBLIC DISCLOSURE (mandatory-disclosure.html)
     ========================================================================== */
  const docPreviewModal = document.getElementById('docPreviewModal');
  const previewDocBtns = document.querySelectorAll('.btn-preview-doc');
  const modalDocClose = document.querySelectorAll('.modal-doc-close');
  const docModalTitle = document.getElementById('docModalTitle');
  const docModalSubtitle = document.getElementById('docModalSubtitle');
  const docSheetHeading = document.getElementById('docSheetHeading');
  const docSheetRef = document.getElementById('docSheetRef');
  const docSheetText = document.getElementById('docSheetText');
  const docSheetSeal = document.getElementById('docSheetSeal');
  const downloadDocBtns = document.querySelectorAll('.btn-download-doc');

  if (previewDocBtns.length > 0 && docPreviewModal) {
    previewDocBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = btn.getAttribute('data-doc-title') || 'Statutory Disclosure Document';
        const authority = btn.getAttribute('data-doc-authority') || 'Central Board of Secondary Education';
        const refNo = btn.getAttribute('data-doc-ref') || 'CBS/DEL/2026/STAT-01';
        const dateValid = btn.getAttribute('data-doc-valid') || 'Valid & Active for AY 2026-27';
        const textContent = btn.getAttribute('data-doc-text') || 'This document certifies that Crayon Box School, Burari, Delhi complies with all statutory mandates, safety regulations, and pedagogical directives under CBSE Appendix IX.';

        if (docModalTitle) docModalTitle.textContent = title;
        if (docModalSubtitle) docModalSubtitle.textContent = `${authority} • ${refNo}`;
        if (docSheetHeading) docSheetHeading.textContent = title;
        if (docSheetRef) docSheetRef.textContent = `Certificate / Reference No: ${refNo} | Status: ${dateValid}`;
        if (docSheetText) docSheetText.innerHTML = textContent;
        if (docSheetSeal) docSheetSeal.innerHTML = `VERIFIED<br>CBSE / DOE<br>GOVT OF NCT`;

        docPreviewModal.classList.add('active');
        docPreviewModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeDocModal = () => {
      docPreviewModal.classList.remove('active');
      docPreviewModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    modalDocClose.forEach(btn => btn.addEventListener('click', closeDocModal));
    docPreviewModal.addEventListener('click', (e) => {
      if (e.target === docPreviewModal) closeDocModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && docPreviewModal.classList.contains('active')) {
        closeDocModal();
      }
    });
  }

  // Download notification feedback
  if (downloadDocBtns.length > 0) {
    downloadDocBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const origText = btn.innerHTML;
        btn.innerHTML = '⬇ Downloading...';
        btn.disabled = true;
        setTimeout(() => {
          btn.innerHTML = '✔ Saved (PDF)';
          setTimeout(() => {
            btn.innerHTML = origText;
            btn.disabled = false;
          }, 2500);
        }, 800);
      });
    });
  }

  // Sticky Category Nav Spy
  const disclosureNavLinks = document.querySelectorAll('.disclosure-nav-link');
  if (disclosureNavLinks.length > 0) {
    disclosureNavLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          e.preventDefault();
          const target = document.querySelector(href);
          if (target) {
            disclosureNavLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const navBarHeight = 140;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navBarHeight;
            window.scrollTo({
              top: offsetPosition,
              behavior: 'smooth'
            });
          }
        }
      });
    });
  }

  /* ==========================================================================
     SECTION 23 — NEWS, EVENTS & CIRCULARS HUB (news-events.html)
     ========================================================================== */
  const newsFilterBtns = document.querySelectorAll('.news-filter-btn');
  const newsCards = document.querySelectorAll('.news-card');
  const newsSearchInput = document.getElementById('newsSearchInput');
  const newsDetailModal = document.getElementById('newsDetailModal');
  const readNewsBtns = document.querySelectorAll('.btn-read-news');
  const modalNewsClose = document.querySelectorAll('.modal-news-close');
  const modalNewsTitle = document.getElementById('modalNewsTitle');
  const modalNewsDate = document.getElementById('modalNewsDate');
  const modalNewsCategory = document.getElementById('modalNewsCategory');
  const modalNewsBody = document.getElementById('modalNewsBody');

  function filterNews() {
    const activeBtn = document.querySelector('.news-filter-btn.active');
    const cat = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
    const query = newsSearchInput ? newsSearchInput.value.toLowerCase().trim() : '';

    newsCards.forEach(card => {
      const cardCat = card.getAttribute('data-category') || '';
      const text = card.textContent.toLowerCase();
      const matchesCat = (cat === 'all' || cardCat === cat);
      const matchesQuery = (!query || text.includes(query));

      if (matchesCat && matchesQuery) {
        card.style.display = '';
        card.classList.add('in-view');
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (newsFilterBtns.length > 0) {
    newsFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        newsFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterNews();
      });
    });
  }

  if (newsSearchInput) {
    newsSearchInput.addEventListener('input', filterNews);
  }

  // News Modal Detail Lightbox
  if (readNewsBtns.length > 0 && newsDetailModal) {
    readNewsBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const title = btn.getAttribute('data-title') || 'School Announcement';
        const date = btn.getAttribute('data-date') || 'Academic Session 2026-27';
        const cat = btn.getAttribute('data-category') || 'Circular';
        const bodyText = btn.getAttribute('data-body') || 'Full details for this notification are available through the Crayon Box School Parent Portal and administrative desk.';

        if (modalNewsTitle) modalNewsTitle.textContent = title;
        if (modalNewsDate) modalNewsDate.textContent = date;
        if (modalNewsCategory) modalNewsCategory.textContent = cat;
        if (modalNewsBody) modalNewsBody.innerHTML = bodyText;

        newsDetailModal.classList.add('open');
        newsDetailModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeNewsModal = () => {
      newsDetailModal.classList.remove('open');
      newsDetailModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    modalNewsClose.forEach(b => b.addEventListener('click', closeNewsModal));
    newsDetailModal.addEventListener('click', (e) => {
      if (e.target === newsDetailModal) closeNewsModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && newsDetailModal.classList.contains('open')) {
        closeNewsModal();
      }
    });
  }

  /* ==========================================================================
     SECTION 23B — INTERACTIVE MONTHLY ACADEMIC CALENDAR ENGINE
     ========================================================================== */
  const ACADEMIC_EVENTS = [
    // April 2026
    { date: '2026-04-06', title: 'New Academic Session Commences', category: 'cultural', time: '8:00 AM – 1:30 PM', grades: 'All Classes (Nursery to Gr 8)', venue: 'Main Campus', description: 'Welcoming learners with traditional orientation assemblies and class teacher bonding sessions.' },
    { date: '2026-04-11', title: 'Id-ul-Fitr (Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'School closed on account of Id-ul-Fitr.' },
    { date: '2026-04-14', title: 'Dr. B.R. Ambedkar Jayanti & Baisakhi', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Gazetted public holiday.' },
    { date: '2026-04-22', title: 'Earth Day Campus Tree Drive', category: 'cultural', time: '9:30 AM – 12:00 PM', grades: 'Grades 3 to 8', venue: 'Organic Campus Gardens', description: 'Hands-on organic sapling plantation and waste reduction workshops.' },
    { date: '2026-04-25', title: 'New Parent Pastoral Orientation (PTM)', category: 'ptm', time: '9:00 AM – 12:30 PM', grades: 'Foundational Stage', venue: 'Auditorium', description: 'Interactive pastoral and curriculum session with Principal and class counselors.' },

    // May 2026
    { date: '2026-05-01', title: 'International Workers Day Assembly', category: 'cultural', time: '8:15 AM – 9:00 AM', grades: 'All Classes', venue: 'Central Amphitheatre', description: 'Felicitation of transport, security, and cleaning support staff.' },
    { date: '2026-05-09', title: 'Rabindranath Tagore Jayanti Literature Fest', category: 'cultural', time: '10:00 AM – 1:00 PM', grades: 'Grades 1 to 8', venue: 'Language Studios', description: 'Poetry recitals, storytelling circles, and dramatic enactments.' },
    { date: '2026-05-16', title: 'Summer Vacation Begins (thru June 30)', category: 'holiday', time: 'All Day', grades: 'All Students', venue: 'School Closed', description: 'Summer break commences. Holiday exploration projects accessible on Parent ERP.' },
    { date: '2026-05-22', title: 'Optional STEAM Bootcamp Workshop', category: 'sports', time: '9:00 AM – 12:00 PM', grades: 'Grades 4 to 8', venue: 'Robotics Labs', description: '2-week hands-on coding and maker exploration.' },

    // June 2026
    { date: '2026-06-05', title: 'World Environment Day Eco-Contest', category: 'cultural', time: 'Online', grades: 'All Grades', venue: 'Virtual Parent Portal', description: 'Home energy audit and garden photography contest.' },
    { date: '2026-06-21', title: 'International Yoga Day Campus Session', category: 'sports', time: '7:00 AM – 8:30 AM', grades: 'Students & Parents', venue: 'Sports Turf', description: 'Sunrise Pranayama and Surya Namaskar session.' },

    // July 2026
    { date: '2026-07-01', title: 'School Reopens After Summer Break', category: 'cultural', time: '8:00 AM – 2:00 PM', grades: 'All Classes', venue: 'All Wings', description: 'Full scholastic schedule resumes across all grades.' },
    { date: '2026-07-17', title: 'Muharram (Gazetted Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'School closed.' },
    { date: '2026-07-25', title: 'Periodic Assessment 1 (PA-1) Commences', category: 'exam', time: '8:30 AM – 11:30 AM', grades: 'Grades 1 to 8', venue: 'Classrooms', description: 'First formative testing cycle in major subject areas.' },
    { date: '2026-07-31', title: 'PA-1 Assessments Conclude', category: 'exam', time: '8:30 AM – 11:30 AM', grades: 'Grades 1 to 8', venue: 'Classrooms', description: 'Last day of Periodic Assessment 1.' },

    // August 2026
    { date: '2026-08-15', title: '80th Independence Day Celebration', category: 'cultural', time: '8:00 AM – 11:00 AM', grades: 'All Classes', venue: 'School Turf', description: 'Tricolor flag hoisting, march past, and patriotic choral symphony.' },
    { date: '2026-08-22', title: 'Term-1 Parent-Teacher Conference (PTM-1)', category: 'ptm', time: '8:30 AM – 1:00 PM', grades: 'All Grades', venue: 'Classrooms', description: 'PA-1 results evaluation and personalized feedback.' },
    { date: '2026-08-26', title: 'Inter-House Parliamentary Debate', category: 'cultural', time: '10:00 AM – 1:30 PM', grades: 'Grades 6 to 8', venue: 'Auditorium', description: 'Annual debate on artificial intelligence and ethics.' },
    { date: '2026-08-28', title: 'Raksha Bandhan (School Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Festive holiday.' },

    // September 2026
    { date: '2026-09-04', title: 'Janmashtami Celebrations', category: 'cultural', time: '9:00 AM – 12:00 PM', grades: 'Pre-Primary & Primary', venue: 'Amphitheatre', description: 'Cultural pageant, traditional attire, and folk tableaux.' },
    { date: '2026-09-05', title: 'Teachers’ Day (Student Council Takeover)', category: 'cultural', time: '8:30 AM – 1:30 PM', grades: 'All Wings', venue: 'Campus-wide', description: 'Senior students step into educator roles to honor teachers.' },
    { date: '2026-09-08', title: 'State Vedic Math Olympiad Contest', category: 'sports', time: '10:00 AM – 12:30 PM', grades: 'Grades 4 to 8', venue: 'Math Labs', description: 'Speed arithmetic contest across North Delhi schools.' },
    { date: '2026-09-15', title: 'Half-Yearly Summative Assessments (SA-1) Begin', category: 'exam', time: '8:30 AM – 12:00 PM', grades: 'Grades 1 to 8', venue: 'Examination Halls', description: 'Comprehensive mid-term evaluation covering Term-1 curriculum.' },
    { date: '2026-09-26', title: 'Half-Yearly Summative Assessments Conclude', category: 'exam', time: '8:30 AM – 12:00 PM', grades: 'Grades 1 to 8', venue: 'Examination Halls', description: 'Final day of SA-1 written examinations.' },

    // October 2026 (CURRENT)
    { date: '2026-10-02', title: 'Mahatma Gandhi Jayanti (Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'National holiday in honor of Mahatma Gandhi.' },
    { date: '2026-10-05', title: 'Term 2 Academic Session Begins', category: 'cultural', time: '8:00 AM – 2:00 PM', grades: 'All Classes', venue: 'Main Campus', description: 'Commencement of Term-2 scholastic and co-curricular syllabus.' },
    { date: '2026-10-08', title: 'PA-2 Datesheet Released on Parent ERP', category: 'exam', time: '3:00 PM', grades: 'Grades 1 to 8', venue: 'Online Portal', description: 'Examination timetable and syllabus blueprints published.' },
    { date: '2026-10-09', title: 'Inter-Class Science Fair & Reading Hour (TODAY)', category: 'cultural', time: '9:00 AM – 1:30 PM', grades: 'All Classes', venue: 'Central Courtyard & Labs', description: 'Live science experiments, working hydraulic models, and guest author reading hour.' },
    { date: '2026-10-17', title: 'Term-1 Report Card Distribution PTM', category: 'ptm', time: '8:30 AM – 12:30 PM', grades: 'All Classes', venue: 'Classrooms', description: 'Detailed diagnostic discussion on student progress with parents.' },
    { date: '2026-10-18', title: 'Grandparents’ Day & Heritage Showcase', category: 'cultural', time: '9:30 AM – 12:30 PM', grades: 'Foundational Stage', venue: 'Amphitheatre', description: 'Folk games, music, and tea for loving grandparents.' },
    { date: '2026-10-19', title: 'Autumn Break (Dussehra Holidays thru Oct 22)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'School closed for Autumn and Dussehra celebrations.' },
    { date: '2026-10-24', title: 'STEM & Robotics Fest "INNOVATE 2026"', category: 'sports', time: '9:00 AM – 3:30 PM', grades: 'Inter-School Invitational', venue: 'Labs & Auditorium', description: 'Over 28 schools compete in robotics, drone navigation, and game coding.' },
    { date: '2026-10-28', title: 'Diwali & Chhath Puja Festive Break (thru Nov 03)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'School closed for Diwali, Govardhan Puja, Bhai Dooj and Chhath.' },

    // November 2026
    { date: '2026-11-04', title: 'School Reopens After Festive Break', category: 'cultural', time: '8:00 AM – 2:00 PM', grades: 'All Classes', venue: 'Campus', description: 'Classes resume with regular timetable.' },
    { date: '2026-11-14', title: 'Children’s Day Carnival & Annual Fete', category: 'cultural', time: '8:30 AM – 1:30 PM', grades: 'Whole School', venue: 'Sports Turf', description: 'Fun game stalls, magic show, food kiosks, and teacher musical performances.' },
    { date: '2026-11-16', title: 'Periodic Assessment 2 (PA-2) Commences', category: 'exam', time: '8:30 AM – 11:30 AM', grades: 'Grades 1 to 8', venue: 'Classrooms', description: 'Term-2 diagnostic pen-and-paper assessments.' },
    { date: '2026-11-24', title: 'Guru Nanak Jayanti (Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Gazetted holiday.' },
    { date: '2026-11-28', title: 'Post-PA-2 Parent Teacher Meeting (PTM)', category: 'ptm', time: '8:30 AM – 12:30 PM', grades: 'All Grades', venue: 'Classrooms', description: 'Review of PA-2 performance and remediation planning.' },

    // December 2026
    { date: '2026-12-05', title: 'Annual Athletic Sports Meet 2026', category: 'sports', time: '9:00 AM – 2:30 PM', grades: 'All Houses', venue: 'Burari Sports Turf', description: 'Sprint races, relays, hurdles, shotput, and parent running events.' },
    { date: '2026-12-19', title: 'Annual Cultural Gala "Rang Tarang"', category: 'cultural', time: '4:30 PM – 8:00 PM', grades: 'All Wings', venue: 'Main Auditorium', description: 'Grand musical theatre, classical dance ensembles, and choir symphony.' },
    { date: '2026-12-25', title: 'Christmas Day Celebration & Holiday', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Christmas celebration.' },
    { date: '2026-12-30', title: 'Winter Vacation Begins (thru Jan 10, 2027)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Annual winter break for students.' },

    // January 2027
    { date: '2027-01-11', title: 'School Reopens After Winter Vacation', category: 'cultural', time: '8:30 AM – 2:00 PM', grades: 'All Classes', venue: 'Campus', description: 'Winter hours active (8:30 AM opening).' },
    { date: '2027-01-14', title: 'Makar Sankranti / Pongal Celebration', category: 'cultural', time: '9:00 AM – 11:00 AM', grades: 'All Classes', venue: 'Central Courtyard', description: 'Kite flying craft workshops and seasonal harvest assemblies.' },
    { date: '2027-01-26', title: 'Republic Day Parade & NCC Drills', category: 'cultural', time: '8:00 AM – 10:30 AM', grades: 'All Classes', venue: 'Sports Ground', description: 'Patriotic salute, student brass band, and award of merit badges.' },
    { date: '2027-01-30', title: 'Grade 8 Pre-Board Evaluation & Career Clinic', category: 'exam', time: '9:00 AM – 1:00 PM', grades: 'Grade 8', venue: 'Exam Halls', description: 'Diagnostic test preparing learners for high school subject streams.' },

    // February 2027
    { date: '2027-02-06', title: 'Pre-Exam Parent-Teacher Consultation (PTM)', category: 'ptm', time: '8:30 AM – 12:30 PM', grades: 'All Grades', venue: 'Classrooms', description: 'Final strategy alignment before annual examinations.' },
    { date: '2027-02-12', title: 'Maha Shivratri (School Holiday)', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Gazetted holiday.' },
    { date: '2027-02-20', title: 'Class 8 Farewell & Graduation Gala', category: 'cultural', time: '11:00 AM – 2:00 PM', grades: 'Grade 7 & 8', venue: 'Auditorium', description: 'Honoring our senior graduating cohort as they step into high school.' },
    { date: '2027-02-28', title: 'National Science Day & Robotics Expo', category: 'cultural', time: '9:30 AM – 1:30 PM', grades: 'Grades 3 to 8', venue: 'STEAM Hub', description: 'Celebrating Sir C.V. Raman with working science inventions.' },

    // March 2027
    { date: '2027-03-03', title: 'Annual Final Examinations 2026–27 Begin', category: 'exam', time: '8:30 AM – 12:00 PM', grades: 'Grades 1 to 8', venue: 'Exam Halls', description: 'Scholastic end-of-year assessments.' },
    { date: '2027-03-15', title: 'Annual Examinations Conclude', category: 'exam', time: '8:30 AM – 12:00 PM', grades: 'Grades 1 to 8', venue: 'Exam Halls', description: 'Final exam paper submission.' },
    { date: '2027-03-17', title: 'Holi Festive Break', category: 'holiday', time: 'All Day', grades: 'All School', venue: 'School Closed', description: 'Festival of colors holiday.' },
    { date: '2027-03-27', title: 'Annual Result Declaration & PTM', category: 'ptm', time: '8:30 AM – 1:00 PM', grades: 'All Classes', venue: 'Classrooms', description: 'Collection of cumulative annual grade report cards.' },
    { date: '2027-03-31', title: 'Academic Session 2026–27 Concludes', category: 'cultural', time: 'All Day', grades: 'Whole School', venue: 'Campus', description: 'Official transition to Academic Session 2027–28.' }
  ];

  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Default to October 2026 (current in-session month)
  let calCurrentYear = 2026;
  let calCurrentMonth = 9; // 0-indexed (9 = October)
  let calActiveCategory = 'all';

  function renderMonthCalendar() {
    const grid = document.getElementById('calendarMonthGrid');
    const label = document.getElementById('calendarCurrentMonthLabel');
    if (!grid || !label) return;

    label.textContent = `${MONTH_NAMES[calCurrentMonth]} ${calCurrentYear}`;

    // Update nav buttons disabled state (Session limits: Apr 2026 to Mar 2027)
    const btnPrev = document.getElementById('btnCalPrevMonth');
    const btnNext = document.getElementById('btnCalNextMonth');
    if (btnPrev) btnPrev.disabled = (calCurrentYear === 2026 && calCurrentMonth === 3); // Apr 2026
    if (btnNext) btnNext.disabled = (calCurrentYear === 2027 && calCurrentMonth === 2); // Mar 2027

    grid.innerHTML = '';

    // First day of month & total days
    const firstDayIndex = new Date(calCurrentYear, calCurrentMonth, 1).getDay();
    const daysInMonth = new Date(calCurrentYear, calCurrentMonth + 1, 0).getDate();
    const prevMonthDays = new Date(calCurrentYear, calCurrentMonth, 0).getDate();

    // Leading padding cells from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell inactive';
      cell.innerHTML = `
        <div class="calendar-day-top">
          <span class="calendar-day-num">${prevMonthDays - i}</span>
        </div>
      `;
      grid.appendChild(cell);
    }

    // Days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell';

      const monthStr = String(calCurrentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${calCurrentYear}-${monthStr}-${dayStr}`;

      const isToday = (dateKey === '2026-10-09');
      if (isToday) cell.classList.add('today');

      // Filter events on this date
      const dayEvents = ACADEMIC_EVENTS.filter(e => {
        if (e.date !== dateKey) return false;
        if (calActiveCategory === 'all') return true;
        return e.category === calActiveCategory;
      });

      let eventsHtml = '';
      dayEvents.forEach(ev => {
        eventsHtml += `
          <div class="event-pill ${ev.category}" title="${ev.title}">
            <span class="cal-legend-dot dot-${ev.category}"></span>
            <span class="event-pill-text">${ev.title}</span>
          </div>
        `;
      });

      cell.innerHTML = `
        <div class="calendar-day-top">
          <span class="calendar-day-num">${day}</span>
          ${isToday ? '<span class="calendar-today-pill">TODAY</span>' : ''}
        </div>
        <div class="calendar-day-events">${eventsHtml}</div>
      `;

      // Click to open Day Details Modal
      cell.addEventListener('click', () => {
        openCalendarDayModal(dateKey, day, MONTH_NAMES[calCurrentMonth], calCurrentYear);
      });

      grid.appendChild(cell);
    }

    // Trailing padding cells to complete grid
    const totalRendered = firstDayIndex + daysInMonth;
    const remaining = (7 - (totalRendered % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      const cell = document.createElement('div');
      cell.className = 'calendar-day-cell inactive';
      cell.innerHTML = `
        <div class="calendar-day-top">
          <span class="calendar-day-num">${j}</span>
        </div>
      `;
      grid.appendChild(cell);
    }
  }

  function openCalendarDayModal(dateKey, day, monthName, year) {
    const modal = document.getElementById('calendarDayModal');
    if (!modal) return;

    const modalTitle = document.getElementById('modalDayTitle');
    const modalList = document.getElementById('modalDayEventsList');
    if (modalTitle) modalTitle.textContent = `${day} ${monthName} ${year}`;

    const matchingEvents = ACADEMIC_EVENTS.filter(e => e.date === dateKey);
    if (modalList) {
      if (matchingEvents.length === 0) {
        modalList.innerHTML = `
          <div style="text-align: center; padding: 30px; color: var(--text-muted);">
            <div style="font-size: 2.2rem; margin-bottom: 8px;">📖</div>
            <strong>Regular School Day</strong>
            <p style="font-size: 0.88rem; margin-top: 4px;">Regular timetable, foundational &amp; middle wing classes active (8:00 AM – 2:00 PM).</p>
          </div>
        `;
      } else {
        let listHtml = '';
        matchingEvents.forEach(ev => {
          const catLabels = {
            exam: 'Examination / Assessment',
            holiday: 'School Holiday / Vacation',
            sports: 'Sports & Olympiad',
            cultural: 'Cultural & Assembly',
            ptm: 'Parent-Teacher Meeting'
          };
          listHtml += `
            <div class="modal-day-item">
              <div class="modal-day-item-header">
                <span class="news-category-badge cat-${ev.category}">${catLabels[ev.category] || ev.category}</span>
                <span style="font-size: 0.82rem; font-weight: 700; color: var(--navy);">${ev.time}</span>
              </div>
              <h4 class="modal-day-item-title">${ev.title}</h4>
              <p style="font-size: 0.9rem; color: var(--text-main); margin: 8px 0 10px; line-height: 1.5;">${ev.description}</p>
              <div class="modal-day-item-meta">
                <span>📍 <strong>Venue:</strong> ${ev.venue}</span>
                <span>🎓 <strong>Grades:</strong> ${ev.grades}</span>
              </div>
            </div>
          `;
        });
        modalList.innerHTML = listHtml;
      }
    }

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeCalendarDayModal() {
    const modal = document.getElementById('calendarDayModal');
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Export iCal (.ics) function
  function downloadIcsCalendar() {
    let icsData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Crayon Box School//Academic Calendar 2026-2027//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:Crayon Box School Academic Calendar 2026-27',
      'X-WR-TIMEZONE:Asia/Kolkata'
    ];

    ACADEMIC_EVENTS.forEach((e, idx) => {
      const cleanDate = e.date.replace(/-/g, '');
      icsData.push(
        'BEGIN:VEVENT',
        `UID:cbs-event-${idx}-${cleanDate}@crayonboxschool.com`,
        `DTSTAMP:${cleanDate}T090000Z`,
        `DTSTART;VALUE=DATE:${cleanDate}`,
        `SUMMARY:${e.title} - Crayon Box School`,
        `DESCRIPTION:${e.description.replace(/,/g, '\\,')} (${e.grades})`,
        `LOCATION:${e.venue}`,
        'STATUS:CONFIRMED',
        'END:VEVENT'
      );
    });

    icsData.push('END:VCALENDAR');
    const blob = new Blob([icsData.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crayon-box-school-calendar-2026-27.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof showCustomToast === 'function') {
      showCustomToast('Academic Calendar downloaded (.ics file ready for Google / Apple Calendar)!');
    }
  }

  // Bind Calendar Controls
  const btnCalPrev = document.getElementById('btnCalPrevMonth');
  const btnCalNext = document.getElementById('btnCalNextMonth');

  if (btnCalPrev) {
    btnCalPrev.addEventListener('click', () => {
      if (calCurrentMonth === 0) {
        calCurrentMonth = 11;
        calCurrentYear--;
      } else {
        calCurrentMonth--;
      }
      renderMonthCalendar();
    });
  }

  if (btnCalNext) {
    btnCalNext.addEventListener('click', () => {
      if (calCurrentMonth === 11) {
        calCurrentMonth = 0;
        calCurrentYear++;
      } else {
        calCurrentMonth++;
      }
      renderMonthCalendar();
    });
  }

  // Calendar Category Filter Buttons
  const calFilterBtns = document.querySelectorAll('.cal-filter-btn');
  if (calFilterBtns.length > 0) {
    calFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        calFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        calActiveCategory = btn.getAttribute('data-cal-category') || 'all';
        renderMonthCalendar();
      });
    });
  }

  // Bind Day Modal Close
  const closeDayModalBtns = document.querySelectorAll('.modal-day-close');
  closeDayModalBtns.forEach(btn => btn.addEventListener('click', closeCalendarDayModal));
  const dayModal = document.getElementById('calendarDayModal');
  if (dayModal) {
    dayModal.addEventListener('click', (e) => {
      if (e.target === dayModal) closeCalendarDayModal();
    });
  }

  // Bind iCal Sync Buttons
  const icalBtns = document.querySelectorAll('.btn-sync-ical');
  icalBtns.forEach(btn => btn.addEventListener('click', downloadIcsCalendar));

  // Print Calendar Button
  const printCalBtn = document.getElementById('btnPrintCalendar');
  if (printCalBtn) {
    printCalBtn.addEventListener('click', () => window.print());
  }

  // Initialize Calendar on load if grid is present
  if (document.getElementById('calendarMonthGrid')) {
    renderMonthCalendar();
  }

  /* ==========================================================================
     SECTION 24 — ALUMNI NETWORK & WALL OF FAME (alumni.html)
     ========================================================================== */
  const alumniFilterBtns = document.querySelectorAll('.alumni-filter-btn');
  const alumniCards = document.querySelectorAll('.alumni-card');
  const alumniSearchInput = document.getElementById('alumniSearchInput');
  const alumniStoryModal = document.getElementById('alumniStoryModal');
  const readAlumniBtns = document.querySelectorAll('.btn-read-alumni');
  const modalAlumniClose = document.querySelectorAll('.modal-alumni-close');
  const modalAlumniName = document.getElementById('modalAlumniName');
  const modalAlumniRole = document.getElementById('modalAlumniRole');
  const modalAlumniBatch = document.getElementById('modalAlumniBatch');
  const modalAlumniBody = document.getElementById('modalAlumniBody');
  const alumniRegistrationForm = document.getElementById('alumniRegistrationForm');
  const alumniToast = document.getElementById('alumniToast');

  function showAlumniToast(msg, isSuccess = true) {
    if (!alumniToast) return;
    alumniToast.innerHTML = (isSuccess ? '&#10004; ' : '&#9888; ') + msg;
    alumniToast.style.backgroundColor = isSuccess ? '#166534' : '#C62828';
    alumniToast.classList.add('show');
    setTimeout(() => {
      alumniToast.classList.remove('show');
    }, 4500);
  }

  function filterAlumni() {
    const activeBtn = document.querySelector('.alumni-filter-btn.active');
    const cat = activeBtn ? activeBtn.getAttribute('data-category') : 'all';
    const query = alumniSearchInput ? alumniSearchInput.value.toLowerCase().trim() : '';

    alumniCards.forEach(card => {
      const cardCat = card.getAttribute('data-category') || '';
      const text = card.textContent.toLowerCase();
      const matchesCat = (cat === 'all' || cardCat === cat);
      const matchesQuery = (!query || text.includes(query));

      if (matchesCat && matchesQuery) {
        card.style.display = '';
        card.classList.add('in-view');
      } else {
        card.style.display = 'none';
      }
    });
  }

  if (alumniFilterBtns.length > 0) {
    alumniFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        alumniFilterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterAlumni();
      });
    });
  }

  if (alumniSearchInput) {
    alumniSearchInput.addEventListener('input', filterAlumni);
  }

  // Alumni Story Modal
  if (readAlumniBtns.length > 0 && alumniStoryModal) {
    readAlumniBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const name = btn.getAttribute('data-name') || 'Alumnus';
        const role = btn.getAttribute('data-role') || 'Graduate';
        const batch = btn.getAttribute('data-batch') || 'Batch';
        const bodyText = btn.getAttribute('data-body') || 'Journey narrative will be updated shortly.';

        if (modalAlumniName) modalAlumniName.textContent = name;
        if (modalAlumniRole) modalAlumniRole.textContent = role;
        if (modalAlumniBatch) modalAlumniBatch.textContent = batch;
        if (modalAlumniBody) modalAlumniBody.innerHTML = bodyText;

        alumniStoryModal.classList.add('open');
        alumniStoryModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    const closeAlumniModal = () => {
      alumniStoryModal.classList.remove('open');
      alumniStoryModal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    modalAlumniClose.forEach(b => b.addEventListener('click', closeAlumniModal));
    alumniStoryModal.addEventListener('click', (e) => {
      if (e.target === alumniStoryModal) closeAlumniModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && alumniStoryModal.classList.contains('open')) {
        closeAlumniModal();
      }
    });
  }

  // Alumni Registration Form
  if (alumniRegistrationForm) {
    alumniRegistrationForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = alumniRegistrationForm.querySelector('button[type="submit"]');
      const origText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.innerHTML = 'Connecting with Network...';
        submitBtn.disabled = true;
      }

      const payload = {
        fullName: document.getElementById('alumniName')?.value || '',
        batchYear: document.getElementById('alumniBatch')?.value || 2024,
        email: document.getElementById('alumniEmail')?.value || '',
        phone: document.getElementById('alumniPhone')?.value || '',
        currentOrg: document.getElementById('alumniOrg')?.value || '',
        currentRole: document.getElementById('alumniDomain')?.value || '',
        city: 'Delhi',
        linkedinUrl: document.getElementById('alumniLinkedin')?.value || '',
        mentorship: true
      };

      try {
        const res = await fetch('/api/alumni/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const d = await res.json();
        if (d.success) {
          if (submitBtn) {
            submitBtn.innerHTML = '&#10004; Registered Successfully!';
            submitBtn.style.backgroundColor = '#166534';
          }
          showAlumniToast('Welcome back to Crayon Box School Alumni Network! Your details have been submitted.');
          setTimeout(() => {
            alumniRegistrationForm.reset();
            if (submitBtn) {
              submitBtn.innerHTML = origText;
              submitBtn.style.backgroundColor = '';
              submitBtn.disabled = false;
            }
          }, 3500);
        }
      } catch (err) {
        console.error(err);
        showAlumniToast('Network error while registering. Please try again.', false);
        if (submitBtn) {
          submitBtn.innerHTML = origText;
          submitBtn.disabled = false;
        }
      }
    });
  }

  /* ==========================================================================
     SECTION 25 — ACCESSIBILITY & READING TOOLBAR (WCAG AAA)
     ========================================================================== */
  const a11yTriggerBtn = document.getElementById('a11yTriggerBtn');
  const a11yPanel = document.getElementById('a11yPanel');
  const a11yCloseBtn = document.getElementById('a11yCloseBtn');
  const a11yFontBtns = document.querySelectorAll('.a11y-font-btn');
  const a11yContrastBtns = document.querySelectorAll('.a11y-contrast-btn');
  const a11yDyslexiaSwitch = document.getElementById('a11yDyslexiaSwitch');
  const a11yLinksSwitch = document.getElementById('a11yLinksSwitch');
  const a11yResetBtn = document.getElementById('a11yResetBtn');

  // Load saved accessibility preferences
  const loadA11yPrefs = () => {
    try {
      const prefs = JSON.parse(localStorage.getItem('cbs_a11y_prefs') || '{}');
      
      // Font scale
      if (prefs.fontScale) {
        document.documentElement.classList.remove('font-scale-sm', 'font-scale-base', 'font-scale-lg', 'font-scale-xl');
        if (prefs.fontScale !== 'base') {
          document.documentElement.classList.add(`font-scale-${prefs.fontScale}`);
        }
        a11yFontBtns.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-scale') === prefs.fontScale);
        });
      }

      // Contrast
      if (prefs.contrast) {
        document.body.classList.remove('high-contrast', 'monochrome');
        if (prefs.contrast === 'high') document.body.classList.add('high-contrast');
        if (prefs.contrast === 'mono') document.body.classList.add('monochrome');
        a11yContrastBtns.forEach(b => {
          b.classList.toggle('active', b.getAttribute('data-contrast') === prefs.contrast);
        });
      }

      // Dyslexia Font
      if (prefs.dyslexia) {
        document.body.classList.add('dyslexia-font');
        if (a11yDyslexiaSwitch) a11yDyslexiaSwitch.classList.add('active');
      }

      // Highlight Links
      if (prefs.highlightLinks) {
        document.body.classList.add('highlight-links');
        if (a11yLinksSwitch) a11yLinksSwitch.classList.add('active');
      }
    } catch (e) {
      console.warn('A11y prefs read error', e);
    }
  };

  const saveA11yPrefs = () => {
    try {
      const activeFont = document.querySelector('.a11y-font-btn.active');
      const activeContrast = document.querySelector('.a11y-contrast-btn.active');
      const prefs = {
        fontScale: activeFont ? activeFont.getAttribute('data-scale') : 'base',
        contrast: activeContrast ? activeContrast.getAttribute('data-contrast') : 'default',
        dyslexia: document.body.classList.contains('dyslexia-font'),
        highlightLinks: document.body.classList.contains('highlight-links')
      };
      localStorage.setItem('cbs_a11y_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn('A11y prefs save error', e);
    }
  };

  // Toggle Panel
  if (a11yTriggerBtn && a11yPanel) {
    a11yTriggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      a11yPanel.classList.toggle('open');
      const isOpen = a11yPanel.classList.contains('open');
      a11yTriggerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    if (a11yCloseBtn) {
      a11yCloseBtn.addEventListener('click', () => {
        a11yPanel.classList.remove('open');
        a11yTriggerBtn.setAttribute('aria-expanded', 'false');
      });
    }

    document.addEventListener('click', (e) => {
      if (a11yPanel.classList.contains('open') && !a11yPanel.contains(e.target) && e.target !== a11yTriggerBtn) {
        a11yPanel.classList.remove('open');
        a11yTriggerBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Font Resizing
  if (a11yFontBtns.length > 0) {
    a11yFontBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const scale = btn.getAttribute('data-scale');
        document.documentElement.classList.remove('font-scale-sm', 'font-scale-base', 'font-scale-lg', 'font-scale-xl');
        if (scale && scale !== 'base') {
          document.documentElement.classList.add(`font-scale-${scale}`);
        }
        a11yFontBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveA11yPrefs();
      });
    });
  }

  // Contrast Modes
  if (a11yContrastBtns.length > 0) {
    a11yContrastBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-contrast');
        document.body.classList.remove('high-contrast', 'monochrome');
        if (mode === 'high') document.body.classList.add('high-contrast');
        if (mode === 'mono') document.body.classList.add('monochrome');
        a11yContrastBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        saveA11yPrefs();
      });
    });
  }

  // Dyslexia Switch
  if (a11yDyslexiaSwitch) {
    a11yDyslexiaSwitch.addEventListener('click', () => {
      document.body.classList.toggle('dyslexia-font');
      a11yDyslexiaSwitch.classList.toggle('active');
      saveA11yPrefs();
    });
  }

  // Highlight Links Switch
  if (a11yLinksSwitch) {
    a11yLinksSwitch.addEventListener('click', () => {
      document.body.classList.toggle('highlight-links');
      a11yLinksSwitch.classList.toggle('active');
      saveA11yPrefs();
    });
  }

  // Reset Settings
  if (a11yResetBtn) {
    a11yResetBtn.addEventListener('click', () => {
      document.documentElement.classList.remove('font-scale-sm', 'font-scale-base', 'font-scale-lg', 'font-scale-xl');
      document.body.classList.remove('high-contrast', 'monochrome', 'dyslexia-font', 'highlight-links');
      a11yFontBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-scale') === 'base'));
      a11yContrastBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-contrast') === 'default'));
      if (a11yDyslexiaSwitch) a11yDyslexiaSwitch.classList.remove('active');
      if (a11yLinksSwitch) a11yLinksSwitch.classList.remove('active');
      try {
        localStorage.removeItem('cbs_a11y_prefs');
      } catch (e) {}
    });
  }

  // Initialize on load
  loadA11yPrefs();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initCrayonBoxApp);
} else {
  initCrayonBoxApp();
}
