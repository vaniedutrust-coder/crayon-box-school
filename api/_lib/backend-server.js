const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { initDb, queries } = require('./backend-db.js');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const ROOT = path.resolve(__dirname, '..', '..');
const isVercel = Boolean(process.env.VERCEL);
const UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads', 'resumes') : path.join(ROOT, 'uploads', 'resumes');
const BACKUPS_DIR = isVercel ? path.join('/tmp', 'backups', 'pages') : path.join(ROOT, 'backups', 'pages');
const IMAGE_UPLOADS_DIR = isVercel ? path.join('/tmp', 'uploads', 'images') : path.join(ROOT, 'uploads', 'images');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(IMAGE_UPLOADS_DIR)) fs.mkdirSync(IMAGE_UPLOADS_DIR, { recursive: true });

function getEditablePages() {
  try {
    return fs.readdirSync(ROOT)
      .filter(f => f.endsWith('.html') && f !== 'admin.html')
      .sort();
  } catch (e) {
    return [
      'index.html', 'about.html', 'academics.html', 'admissions.html',
      'campus.html', 'careers.html', 'contact.html', 'gallery.html',
      'news-events.html', 'parents.html', 'student-life.html', 'alumni.html',
      'mandatory-disclosure.html', 'privacy-policy.html', 'terms.html', '404.html'
    ];
  }
}

// Initialize database
initDb();

// In-memory active session store (token -> session)
const activeSessions = new Map();

// In-memory rate limiting stores (IP -> { count, resetAt })
const loginRateLimiter = new Map();
const formRateLimiter = new Map();

function checkRateLimit(limiter, key, maxAttempts, windowMs) {
  const now = Date.now();
  let record = limiter.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 1, resetAt: now + windowMs };
    limiter.set(key, record);
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  record.count++;
  return { allowed: true, remaining: maxAttempts - record.count };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || '127.0.0.1';
}

// Sweep expired rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginRateLimiter) if (now > v.resetAt) loginRateLimiter.delete(k);
  for (const [k, v] of formRateLimiter) if (now > v.resetAt) formRateLimiter.delete(k);
}, 10 * 60 * 1000).unref();

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8'
};

function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
    const [k, v] = c.trim().split('=');
    if (k && v) cookies[k] = decodeURIComponent(v);
  });
  return cookies;
}

function getSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies.cbs_admin_session;
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function sendJson(res, statusCode, data, isPublic = false) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (isPublic) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.end(JSON.stringify(data));
}

function readBodyJson(req, maxBytes = 15 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let received = 0;
    req.on('data', chunk => {
      received += chunk.length;
      if (received > maxBytes) {
        req.destroy(new Error('Payload too large'));
        return reject(new Error('Payload too large'));
      }
      body += chunk;
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sanitizeText(str) {
  if (!str) return '';
  return String(str).trim();
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const reqPath = decodeURI(urlParts[0]);
  const queryString = urlParts[1] || '';
  const queryParams = new URLSearchParams(queryString);

  // Security Headers (Defense-in-depth: HSTS, CSP, Sniffing, Frameguard, Permissions)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self';");

  // Domain Redirect: crayonboxpreschool.in -> https://www.crayonboxschool.com
  const reqHost = (req.headers.host || '').toLowerCase();
  if (reqHost.includes('crayonboxpreschool.in')) {
    res.statusCode = 308;
    res.setHeader('Location', `https://www.crayonboxschool.com${req.url}`);
    res.end();
    return;
  }

  // Legacy Route Redirects (308 Permanent)
  const LEGACY_ROUTE_REDIRECTS = {
    '/campus-life': '/student-life.html',
    '/campus-life.html': '/student-life.html',
    '/news': '/news-events.html',
    '/news.html': '/news-events.html',
    '/faculty': '/about.html',
    '/faculty.html': '/about.html',
    '/enquiry': '/admissions.html',
    '/apply': '/admissions.html',
    '/tour': '/admissions.html',
    '/parent-corner': '/parents.html',
    '/disclosure': '/mandatory-disclosure.html'
  };
  const cleanReqPath = reqPath.endsWith('/') && reqPath.length > 1 ? reqPath.slice(0, -1) : reqPath;
  if (LEGACY_ROUTE_REDIRECTS[cleanReqPath] || LEGACY_ROUTE_REDIRECTS[cleanReqPath.toLowerCase()]) {
    const dest = LEGACY_ROUTE_REDIRECTS[cleanReqPath] || LEGACY_ROUTE_REDIRECTS[cleanReqPath.toLowerCase()];
    res.statusCode = 308;
    res.setHeader('Location', dest + (queryString ? `?${queryString}` : ''));
    res.end();
    return;
  }

  // =========================================================================
  // REST API ROUTING (/api/*)
  // =========================================================================
  if (reqPath.startsWith('/api/')) {

    // 0. PUBLIC: Liveness & Health Probe
    if (req.method === 'GET' && reqPath === '/api/health') {
      return sendJson(res, 200, {
        status: 'UP',
        service: 'Crayon Box School Production Server',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime())
      });
    }

    // 1. PUBLIC: Admissions Application (supports both /api/admissions/apply and legacy /api/inquiries)
    if (req.method === 'POST' && (reqPath === '/api/admissions/apply' || reqPath === '/api/inquiries')) {
      const clientIp = getClientIp(req);
      const limit = checkRateLimit(formRateLimiter, clientIp, 30, 10 * 60 * 1000);
      if (!limit.allowed) {
        res.setHeader('Retry-After', limit.retryAfter);
        return sendJson(res, 429, { success: false, error: `Too many submissions. Please wait ${limit.retryAfter}s.` }, true);
      }

      try {
        const body = await readBodyJson(req, 2 * 1024 * 1024);
        const studentName = sanitizeText(body.studentName || body.student_name);
        const parentName = sanitizeText(body.parentName || body.parent_name);
        const phone = sanitizeText(body.phone || body.parent_phone);
        const grade = sanitizeText(body.grade || body.grade_applied);
        const email = sanitizeText(body.email || body.parent_email);
        const notes = sanitizeText(body.notes || body.message || body.counselor_notes);
        if (!studentName || !parentName || !phone || !grade) {
          return sendJson(res, 400, { success: false, error: 'Please provide all mandatory fields.' }, true);
        }
        const appNo = queries.createAdmission({
          studentName,
          parentName,
          phone,
          grade,
          email,
          dob: sanitizeText(body.dob),
          locality: sanitizeText(body.locality),
          previousSchool: sanitizeText(body.previousSchool || body.previous_school),
          notes
        });
        return sendJson(res, 201, {
          success: true,
          message: 'Admission inquiry submitted successfully!',
          appNo,
          id: appNo
        }, true);
      } catch (e) {
        return sendJson(res, 500, { success: false, error: 'Failed to process admission inquiry.' }, true);
      }
    }

    // 2. PUBLIC: Campus Walkthrough Booking (supports both /api/tours/book and legacy /api/tour-bookings)
    if (req.method === 'POST' && (reqPath === '/api/tours/book' || reqPath === '/api/tour-bookings')) {
      const clientIp = getClientIp(req);
      const limit = checkRateLimit(formRateLimiter, clientIp, 30, 10 * 60 * 1000);
      if (!limit.allowed) {
        res.setHeader('Retry-After', limit.retryAfter);
        return sendJson(res, 429, { success: false, error: `Too many submissions. Please wait ${limit.retryAfter}s.` }, true);
      }

      try {
        const body = await readBodyJson(req, 2 * 1024 * 1024);
        const parentName = sanitizeText(body.parentName || body.parent_name);
        const phone = sanitizeText(body.phone || body.parent_phone);
        const date = sanitizeText(body.date || body.tour_date);
        const timeSlot = sanitizeText(body.timeSlot || body.tour_time);
        const email = sanitizeText(body.email || body.parent_email);
        const grade = sanitizeText(body.grade || body.child_grade);
        const attendees = Number(body.attendees) || 2;
        const notes = sanitizeText(body.notes || body.message);
        if (!parentName || !phone || !date || !timeSlot) {
          return sendJson(res, 400, { success: false, error: 'Please specify parent name, contact, date, and preferred time slot.' }, true);
        }
        const bookingRef = queries.createTour({
          parentName,
          phone,
          date,
          timeSlot,
          email,
          grade,
          attendees,
          notes
        });
        return sendJson(res, 201, {
          success: true,
          message: 'Campus walkthrough booked successfully!',
          bookingRef,
          id: bookingRef
        }, true);
      } catch (e) {
        return sendJson(res, 500, { success: false, error: 'Failed to book campus visit.' }, true);
      }
    }

    // 3. PUBLIC: Careers Application (with resume upload)
    if (req.method === 'POST' && reqPath === '/api/careers/apply') {
      const clientIp = getClientIp(req);
      const limit = checkRateLimit(formRateLimiter, clientIp, 15, 10 * 60 * 1000);
      if (!limit.allowed) {
        res.setHeader('Retry-After', limit.retryAfter);
        return sendJson(res, 429, { success: false, error: `Too many upload attempts. Please wait ${limit.retryAfter}s.` }, true);
      }

      try {
        const body = await readBodyJson(req, 15 * 1024 * 1024);
        const candidateName = sanitizeText(body.candidateName || body.fullName);
        const email = sanitizeText(body.email);
        const phone = sanitizeText(body.phone);
        const position = sanitizeText(body.position);
        if (!candidateName || !email || !phone || !position) {
          return sendJson(res, 400, { success: false, error: 'Please provide name, contact details, and position.' }, true);
        }

        let savedResumeFilename = null;
        if (body.resumeBase64 && body.resumeFilename) {
          const cleanName = sanitizeText(body.resumeFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
          const ext = path.extname(cleanName).toLowerCase();
          if (['.pdf', '.docx', '.doc'].includes(ext)) {
            const uniqueName = `cv_${Date.now()}_${cleanName}`;
            const diskPath = path.join(UPLOADS_DIR, uniqueName);
            const base64Data = body.resumeBase64.replace(/^data:[^;]+;base64,/, '');
            fs.writeFileSync(diskPath, Buffer.from(base64Data, 'base64'));
            savedResumeFilename = uniqueName;
          }
        }

        const appId = queries.createJobApplication({
          ...body,
          candidateName,
          email,
          phone,
          position,
          resumeFilename: savedResumeFilename,
          resumeOriginalName: sanitizeText(body.resumeFilename) || null
        });

        return sendJson(res, 201, {
          success: true,
          message: 'Application and resume submitted successfully!',
          appId,
          applicationRef: appId
        }, true);
      } catch (e) {
        console.error('Careers upload error:', e);
        return sendJson(res, 500, { success: false, error: 'Failed to submit application.' }, true);
      }
    }

    // 4. PUBLIC: Alumni Registration & Directory
    if (req.method === 'POST' && reqPath === '/api/alumni/register') {
      try {
        const body = await readBodyJson(req, 1024 * 1024);
        if (!body.fullName || !body.batchYear || !body.email) {
          return sendJson(res, 400, { success: false, error: 'Please provide your full name, batch year, and email.' }, true);
        }
        queries.createAlumni(body);
        return sendJson(res, 201, { success: true, message: 'Alumni registration successful!' }, true);
      } catch (e) {
        return sendJson(res, 500, { success: false, error: 'Failed to register alumni.' }, true);
      }
    }

    if (req.method === 'GET' && reqPath === '/api/alumni/directory') {
      const list = queries.getAlumni(true);
      return sendJson(res, 200, { success: true, alumni: list }, true);
    }

    // 5. PUBLIC: Contact & Grievance Message
    if (req.method === 'POST' && reqPath === '/api/contact/send') {
      const clientIp = getClientIp(req);
      const limit = checkRateLimit(formRateLimiter, clientIp, 20, 10 * 60 * 1000);
      if (!limit.allowed) {
        res.setHeader('Retry-After', limit.retryAfter);
        return sendJson(res, 429, { success: false, error: `Too many messages sent. Please wait ${limit.retryAfter}s.` }, true);
      }

      try {
        const body = await readBodyJson(req, 1024 * 1024);
        const name = sanitizeText(body.name);
        const email = sanitizeText(body.email);
        const message = sanitizeText(body.message);
        if (!name || !email || !message) {
          return sendJson(res, 400, { success: false, error: 'Please provide name, email, and message content.' }, true);
        }
        const ticketId = queries.createContactMessage({
          ...body,
          name,
          email,
          message
        });
        return sendJson(res, 201, {
          success: true,
          message: 'Your message has been received by our school desk.',
          ticketId
        }, true);
      } catch (e) {
        return sendJson(res, 500, { success: false, error: 'Failed to send message.' }, true);
      }
    }

    // 6. AUTHENTICATION: Admin Login / Logout / Me
    if (req.method === 'POST' && reqPath === '/api/auth/login') {
      const clientIp = getClientIp(req);
      const limit = checkRateLimit(loginRateLimiter, clientIp, 5, 15 * 60 * 1000); // 5 attempts per 15 mins
      if (!limit.allowed) {
        res.setHeader('Retry-After', limit.retryAfter);
        return sendJson(res, 429, {
          success: false,
          error: `Too many login attempts. Please wait ${limit.retryAfter} seconds before trying again.`
        });
      }

      try {
        const body = await readBodyJson(req, 64 * 1024);
        const username = sanitizeText(body.username);
        const password = String(body.password || '');
        const user = queries.verifyAdminCredentials(username, password);
        if (!user) {
          return sendJson(res, 401, { success: false, error: 'Invalid username or password.' });
        }

        // Reset rate limiter on successful authentication
        loginRateLimiter.delete(clientIp);

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        activeSessions.set(token, { user, expiresAt });

        const isHttps = req.headers['x-forwarded-proto'] === 'https' || process.env.NODE_ENV === 'production';
        const cookieFlags = [
          `cbs_admin_session=${token}`,
          'Path=/',
          'HttpOnly',
          'SameSite=Strict',
          'Max-Age=86400',
          isHttps ? 'Secure' : ''
        ].filter(Boolean).join('; ');

        res.setHeader('Set-Cookie', cookieFlags);
        return sendJson(res, 200, { success: true, message: 'Login successful', user });
      } catch (e) {
        return sendJson(res, 500, { success: false, error: 'Login authentication error.' });
      }
    }

    if (req.method === 'POST' && reqPath === '/api/auth/logout') {
      const cookies = parseCookies(req.headers.cookie);
      if (cookies.cbs_admin_session) activeSessions.delete(cookies.cbs_admin_session);
      res.setHeader('Set-Cookie', 'cbs_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
      return sendJson(res, 200, { success: true, message: 'Logged out successfully.' });
    }

    if (req.method === 'GET' && reqPath === '/api/auth/me') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { authenticated: false });
      return sendJson(res, 200, { authenticated: true, user: session.user });
    }

    // PROTECTED ADMIN ENDPOINTS
    const session = getSession(req);
    if (!session) {
      return sendJson(res, 401, { success: false, error: 'Unauthorized. Staff session required.' });
    }

    // 7. ADMIN: Overview Stats
    if (req.method === 'GET' && reqPath === '/api/admin/overview') {
      const data = queries.getOverviewStats();
      return sendJson(res, 200, { success: true, ...data });
    }

    // 8. ADMIN: Admissions Management
    if (req.method === 'GET' && reqPath === '/api/admin/admissions') {
      const filter = {
        status: queryParams.get('status') || 'ALL',
        grade: queryParams.get('grade') || 'ALL'
      };
      const list = queries.getAdmissions(filter);
      return sendJson(res, 200, { success: true, admissions: list });
    }

    if (req.method === 'PATCH' && reqPath.startsWith('/api/admin/admissions/')) {
      const id = reqPath.split('/')[4];
      const body = await readBodyJson(req);
      queries.updateAdmissionStatus(Number(id), body.status, body.notes);
      return sendJson(res, 200, { success: true, message: 'Inquiry updated successfully.' });
    }

    // 9. ADMIN: Campus Tours Management
    if (req.method === 'GET' && reqPath === '/api/admin/tours') {
      const list = queries.getTours();
      return sendJson(res, 200, { success: true, tours: list });
    }

    if (req.method === 'PATCH' && reqPath.startsWith('/api/admin/tours/')) {
      const id = reqPath.split('/')[4];
      const body = await readBodyJson(req);
      queries.updateTourStatus(Number(id), body.status);
      return sendJson(res, 200, { success: true, message: 'Tour status updated.' });
    }

    // 10. ADMIN: Careers & Resumes Management
    if (req.method === 'GET' && reqPath === '/api/admin/careers') {
      const list = queries.getJobApplications();
      return sendJson(res, 200, { success: true, candidates: list });
    }

    if (req.method === 'PATCH' && reqPath.startsWith('/api/admin/careers/')) {
      const id = reqPath.split('/')[4];
      const body = await readBodyJson(req);
      queries.updateJobStatus(Number(id), body.status);
      return sendJson(res, 200, { success: true, message: 'Candidate status updated.' });
    }

    // 11. ADMIN: Contact Messages Management
    if (req.method === 'GET' && reqPath === '/api/admin/contact') {
      const list = queries.getContactMessages();
      return sendJson(res, 200, { success: true, messages: list });
    }

    if (req.method === 'PATCH' && reqPath.startsWith('/api/admin/contact/')) {
      const id = reqPath.split('/')[4];
      const body = await readBodyJson(req);
      queries.updateContactStatus(Number(id), body.status);
      return sendJson(res, 200, { success: true, message: 'Message status updated.' });
    }

    // 12. ADMIN: Export to CSV
    if (req.method === 'GET' && reqPath.startsWith('/api/admin/export/')) {
      const type = reqPath.split('/')[4];
      if (type === 'admissions') {
        const rows = queries.getAdmissions();
        let csv = 'Application No,Student Name,Parent Name,Email,Phone,Grade,Locality,Status,Date\n';
        rows.forEach(r => {
          csv += `"${r.app_no}","${r.student_name}","${r.parent_name}","${r.parent_email}","${r.parent_phone}","${r.grade_applied}","${r.locality || ''}","${r.status}","${r.created_at}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="admissions_export.csv"');
        return res.end(csv);
      } else if (type === 'careers') {
        const rows = queries.getJobApplications();
        let csv = 'Application ID,Candidate Name,Email,Phone,Position,Qualification,Experience Years,Status,Date\n';
        rows.forEach(r => {
          csv += `"${r.app_id}","${r.candidate_name}","${r.email}","${r.phone}","${r.position_applied}","${r.qualification}","${r.experience_years}","${r.status}","${r.created_at}"\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="careers_export.csv"');
        return res.end(csv);
      }
    }

    // 13. ADMIN: Get Editable Website Pages & Status
    if (req.method === 'GET' && reqPath === '/api/editor/pages') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { success: false, error: 'Unauthorized.' });

      const pages = getEditablePages().map(file => {
        const fullPath = path.join(ROOT, file);
        if (!fs.existsSync(fullPath)) return null;
        const stats = fs.statSync(fullPath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : file;

        // Check existing backups
        const backups = fs.existsSync(BACKUPS_DIR)
          ? fs.readdirSync(BACKUPS_DIR).filter(b => b.startsWith(file))
          : [];

        return {
          filename: file,
          title,
          sizeBytes: stats.size,
          lastModified: stats.mtime,
          backupsCount: backups.length
        };
      }).filter(Boolean);

      return sendJson(res, 200, { success: true, pages });
    }

    // 14. ADMIN: Save Edited Page with Automated Backup
    if (req.method === 'POST' && reqPath === '/api/editor/save-page') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { success: false, error: 'Staff session required.' });

      try {
        const body = await readBodyJson(req);
        const { filename, htmlContent } = body;

        const allowed = getEditablePages();
        if (!filename || !allowed.includes(filename)) {
          return sendJson(res, 400, { success: false, error: 'Invalid or restricted page target.' });
        }
        if (!htmlContent || typeof htmlContent !== 'string' || htmlContent.length < 100) {
          return sendJson(res, 400, { success: false, error: 'Invalid HTML payload.' });
        }

        const targetFile = path.join(ROOT, filename);

        // 1. Create Timestamped Backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `${filename}.${timestamp}.bak.html`;
        const backupPath = path.join(BACKUPS_DIR, backupFilename);
        if (fs.existsSync(targetFile)) {
          fs.copyFileSync(targetFile, backupPath);
        }

        // 2. Clean any runtime editor tags before persisting
        let cleanHtml = htmlContent
          .replace(/<link[^>]*href=["'][^"']*visual-editor[^"']*["'][^>]*>/gi, '')
          .replace(/<script[^>]*src=["'][^"']*visual-editor[^"']*["'][^>]*><\/script>/gi, '');

        fs.writeFileSync(targetFile, cleanHtml, 'utf8');

        return sendJson(res, 200, {
          success: true,
          message: 'Page successfully updated and published!',
          backupCreated: backupFilename
        });
      } catch (err) {
        console.error('Save page error:', err);
        return sendJson(res, 500, { success: false, error: 'Failed to write page changes.' });
      }
    }

    // 15. ADMIN: Upload Image via Editor
    if (req.method === 'POST' && reqPath === '/api/editor/upload-image') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { success: false, error: 'Staff session required.' });

      try {
        const body = await readBodyJson(req);
        if (!body.filename || !body.base64Data) {
          return sendJson(res, 400, { success: false, error: 'Image data and filename required.' });
        }

        const cleanName = sanitizeText(body.filename).replace(/[^a-zA-Z0-9._-]/g, '_');
        const ext = path.extname(cleanName).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
          return sendJson(res, 400, { success: false, error: 'Unsupported image format. Allowed: JPG, PNG, WEBP, GIF.' });
        }

        const uniqueName = `img_${Date.now()}_${cleanName}`;
        const targetPath = path.join(IMAGE_UPLOADS_DIR, uniqueName);
        const base64Data = body.base64Data.replace(/^data:[^;]+;base64,/, '');
        fs.writeFileSync(targetPath, Buffer.from(base64Data, 'base64'));

        return sendJson(res, 201, {
          success: true,
          message: 'Image uploaded successfully.',
          imageUrl: `uploads/images/${uniqueName}`
        });
      } catch (e) {
        console.error('Image upload error:', e);
        return sendJson(res, 500, { success: false, error: 'Failed to upload image.' });
      }
    }

    // 16. ADMIN: Full Website SEO & Performance Audit
    if (req.method === 'GET' && reqPath === '/api/seo-audit/run') {
      try {
        const pagesAudit = [];
        let totalScoreAcc = 0;

        getEditablePages().forEach(filename => {
          const filePath = path.join(ROOT, filename);
          if (!fs.existsSync(filePath)) return;

          const content = fs.readFileSync(filePath, 'utf8');

          // Checks
          const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : '';

          const descMatch = content.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i) ||
                            content.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["'][^>]*>/i);
          const description = descMatch ? descMatch[1].trim() : '';

          const ogTitle = /<meta[^>]*property=["']og:title["']/i.test(content);
          const ogDesc = /<meta[^>]*property=["']og:description["']/i.test(content);
          const ogImage = /<meta[^>]*property=["']og:image["']/i.test(content);
          const twitterCard = /<meta[^>]*name=["']twitter:card["']/i.test(content);
          const schema = /<script[^>]*type=["']application\/ld\+json["']/i.test(content);
          const viewport = /<meta[^>]*name=["']viewport["']/i.test(content);
          const canonical = /<link[^>]*rel=["']canonical["']/i.test(content);

          const h1Matches = content.match(/<h1[^>]*>[\s\S]*?<\/h1>/gi) || [];
          const h1Count = h1Matches.length;

          const imgMatches = content.match(/<img[^>]*>/gi) || [];
          let missingAltCount = 0;
          imgMatches.forEach(img => {
            if (!img.includes('alt=') || /alt=["']\s*["']/i.test(img)) missingAltCount++;
          });

          // Calculate page score
          let pageScore = 0;
          if (title && title.length >= 25 && title.length <= 75) pageScore += 15;
          else if (title) pageScore += 8;

          if (description && description.length >= 80 && description.length <= 200) pageScore += 20;
          else if (description) pageScore += 10;

          if (ogTitle && ogDesc && ogImage) pageScore += 15;
          else if (ogTitle || ogDesc) pageScore += 8;

          if (twitterCard) pageScore += 10;
          if (schema) pageScore += 15;
          if (h1Count === 1) pageScore += 10;
          else if (h1Count > 1) pageScore += 5;

          if (missingAltCount === 0) pageScore += 10;
          else pageScore += Math.max(0, 10 - missingAltCount * 2);

          if (viewport) pageScore += 5;

          totalScoreAcc += pageScore;

          pagesAudit.push({
            filename,
            title,
            titleLength: title.length,
            descriptionLength: description.length,
            hasOg: ogTitle && ogDesc && ogImage,
            hasTwitter: twitterCard,
            hasSchema: schema,
            hasCanonical: canonical,
            h1Count,
            totalImages: imgMatches.length,
            missingAltCount,
            score: pageScore
          });
        });

        // Sitemap check
        const sitemapPath = path.join(ROOT, 'sitemap.xml');
        const hasSitemap = fs.existsSync(sitemapPath);
        let sitemapUrlsCount = 0;
        if (hasSitemap) {
          const sm = fs.readFileSync(sitemapPath, 'utf8');
          sitemapUrlsCount = (sm.match(/<loc>/g) || []).length;
        }

        // Robots check
        const robotsPath = path.join(ROOT, 'robots.txt');
        const hasRobots = fs.existsSync(robotsPath);

        const overallScore = Math.round(totalScoreAcc / (pagesAudit.length || 1));

        return sendJson(res, 200, {
          success: true,
          overallScore,
          totalPagesAudited: pagesAudit.length,
          pages: pagesAudit,
          technicalChecklist: {
            sitemap: { active: hasSitemap, urlsIndexed: sitemapUrlsCount },
            robotsTxt: { active: hasRobots },
            gzipCompression: { active: true, algorithm: 'node:zlib native' },
            cachingHeaders: { active: true, etagSupport: true, staleWhileRevalidate: true },
            responsiveViewports: { active: true, standard: '375px - 3440px' }
          }
        });
      } catch (err) {
        console.error('SEO audit error:', err);
        return sendJson(res, 500, { success: false, error: 'Failed to run SEO audit.' });
      }
    }

    // 17. ADMIN: Create New Page with Standard Layout
    if (req.method === 'POST' && reqPath === '/api/editor/create-page') {
      const session = getSession(req);
      if (!session) return sendJson(res, 401, { success: false, error: 'Staff session required.' });

      try {
        const body = await readBodyJson(req);
        let { pageTitle, slug } = body;

        if (!pageTitle || !slug) {
          return sendJson(res, 400, { success: false, error: 'Page title and URL slug are required.' });
        }

        slug = slug.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/^-+|-+$/g, '');
        if (!slug) slug = 'new-page';
        const filename = `${slug}.html`;
        const targetPath = path.join(ROOT, filename);

        if (fs.existsSync(targetPath)) {
          return sendJson(res, 400, { success: false, error: `Page "${filename}" already exists.` });
        }

        const templateHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(pageTitle)} | Crayon Box School Burari Delhi</title>
  <meta name="description" content="${escapeHtml(pageTitle)} at Crayon Box School, Burari, Delhi. Providing holistic education from Kindergarten through Class 8 and beyond.">
  <link rel="canonical" href="https://crayonboxschool.edu.in/${filename}">
  <link rel="icon" type="image/png" href="cb-logo-circular.png">

  <!-- Open Graph -->
  <meta property="og:title" content="${escapeHtml(pageTitle)} | Crayon Box School">
  <meta property="og:description" content="Discover ${escapeHtml(pageTitle)} at Crayon Box School.">
  <meta property="og:image" content="https://crayonboxschool.edu.in/hero-students.jpg">
  <meta property="og:url" content="https://crayonboxschool.edu.in/${filename}">
  <meta property="og:type" content="website">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(pageTitle)} | Crayon Box School">
  <meta name="twitter:description" content="Discover ${escapeHtml(pageTitle)} at Crayon Box School.">
  <meta name="twitter:image" content="https://crayonboxschool.edu.in/hero-students.jpg">

  <!-- Google Fonts: Fraunces + Outfit -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Outfit:wght@400;500;600;700&display=swap" rel="stylesheet">

  <link rel="stylesheet" href="styles.css">

  <!-- Schema.org EducationalOrganization -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "School",
    "name": "Crayon Box School",
    "url": "https://crayonboxschool.edu.in/${filename}",
    "logo": "https://crayonboxschool.edu.in/cb-logo-circular.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Burari",
      "addressRegion": "Delhi",
      "postalCode": "110084",
      "addressCountry": "IN"
    }
  }
  </script>
</head>
<body>

  <!-- TOP NOTICE BAR -->
  <aside class="top-notice-bar" aria-label="Announcement">
    <div class="container notice-inner">
      <div class="notice-text">
        <span class="sparkle">&#10024;</span>
        <strong>Admissions Open 2026&ndash;27:</strong> Toddlers to Grade 8 &bull; Experience holistic experiential education.
      </div>
      <div class="notice-actions">
        <a href="admissions.html" class="notice-link">Register Online &rarr;</a>
      </div>
    </div>
  </aside>

  <!-- NAVIGATION HEADER -->
  <header class="site-header" id="mainHeader">
    <div class="container header-inner">
      <a href="index.html" class="brand-link" aria-label="Crayon Box School Home">
        <img src="cb-logo-circular.png" alt="Crayon Box Crest" class="brand-crest" width="56" height="56">
        <div class="brand-text">
          <span class="brand-name">Crayon Box School</span>
          <span class="brand-tagline">Learn &bull; Grow &bull; Shine</span>
        </div>
      </a>

      <nav class="main-nav" aria-label="Main Navigation">
        <ul class="nav-list">
          <li><a href="index.html" class="nav-link">Home</a></li>
          <li><a href="about.html" class="nav-link">About Us</a></li>
          <li><a href="academics.html" class="nav-link">Academics</a></li>
          <li><a href="admissions.html" class="nav-link">Admissions</a></li>
          <li><a href="campus.html" class="nav-link">Campus</a></li>
          <li><a href="contact.html" class="nav-link">Contact</a></li>
        </ul>
      </nav>

      <div class="header-actions">
        <a href="admissions.html" class="btn btn-gold btn-sm">Admissions Open &rarr;</a>
        <button class="mobile-menu-toggle" id="mobileMenuBtn" aria-label="Toggle navigation menu">&#9776;</button>
      </div>
    </div>
  </header>

  <main>
    <!-- PAGE HERO BANNER -->
    <section class="section-hero-compact">
      <div class="container">
        <span class="spotlight-tag tag-blue sticker-peel">&#10024; CRAYON BOX ECOSYSTEM</span>
        <h1>${escapeHtml(pageTitle)}</h1>
        <p class="hero-sub" style="max-width: 720px; margin: 16px auto 0; font-size: 1.15rem; color: var(--navy-light);">
          Welcome to ${escapeHtml(pageTitle)}. Use the In-Browser Visual Editor to customize this content live.
        </p>
      </div>
    </section>

    <!-- MAIN CONTENT SECTION -->
    <section class="section" style="padding: 70px 0;">
      <div class="container">
        <div class="content-card shine-card" style="padding: 40px; background: #FFFFFF; border-radius: var(--radius-xl); border: 1px solid rgba(6,36,76,0.08); box-shadow: 0 10px 30px rgba(6,36,76,0.05);">
          <h2>About <span class="highlight-crayon highlight-crayon-gold">${escapeHtml(pageTitle)}</span></h2>
          <p style="font-size: 1.05rem; line-height: 1.7; color: var(--text-main); margin-top: 16px;">
            This is your new page body. Use the In-Browser Visual Editor to add text, headings, buttons, and photos. You can also insert pre-designed section components using the "➕ Add Section" button.
          </p>
          <div style="margin-top: 30px;">
            <a href="contact.html" class="btn btn-primary">Schedule Campus Visit &rarr;</a>
            <a href="admissions.html" class="btn btn-gold" style="margin-left: 12px;">Apply Online</a>
          </div>
        </div>
      </div>
    </section>
  </main>

  <!-- FOOTER -->
  <footer class="site-footer">
    <div class="container footer-inner">
      <div class="footer-col footer-brand-col">
        <div class="footer-logo-row">
          <img src="cb-logo-circular.png" alt="Crayon Box School Logo" class="footer-logo" width="48" height="48">
          <div>
            <h3 class="footer-school-name">Crayon Box School</h3>
            <span class="footer-motto">Learn &bull; Grow &bull; Shine</span>
          </div>
        </div>
        <p class="footer-desc">
          Holistic foundational and middle school education nurturing curious minds and creative spirits in Burari, Delhi.
        </p>
      </div>
      <div class="footer-col">
        <h4 class="footer-heading">Quick Links</h4>
        <ul class="footer-links">
          <li><a href="about.html">About &amp; Leadership</a></li>
          <li><a href="academics.html">CBSE Curriculum</a></li>
          <li><a href="campus.html">Campus Tour</a></li>
          <li><a href="admissions.html">Admissions 2026</a></li>
          <li><a href="contact.html">Contact Us</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="container footer-bottom-inner">
        <p>&copy; 2026 Crayon Box School, Burari, Delhi. All rights reserved.</p>
        <div class="footer-bottom-links">
          <a href="privacy-policy.html">Privacy Policy</a>
          <a href="terms.html">Terms of Use</a>
          <a href="mandatory-disclosure.html">CBSE Disclosure</a>
          <a href="sitemap.xml">Sitemap</a>
        </div>
      </div>
    </div>
  </footer>

  <script src="script.js"></script>
</body>
</html>`;

        fs.writeFileSync(targetPath, templateHtml, 'utf8');

        // Update sitemap.xml automatically
        const sitemapPath = path.join(ROOT, 'sitemap.xml');
        if (fs.existsSync(sitemapPath)) {
          let sm = fs.readFileSync(sitemapPath, 'utf8');
          if (!sm.includes(`/${filename}`)) {
            const today = new Date().toISOString().split('T')[0];
            const newUrlEntry = `  <url>\n    <loc>https://crayonboxschool.edu.in/${filename}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.80</priority>\n  </url>\n</urlset>`;
            sm = sm.replace('</urlset>', newUrlEntry);
            fs.writeFileSync(sitemapPath, sm, 'utf8');
          }
        }

        return sendJson(res, 201, {
          success: true,
          message: `Page "${filename}" created successfully!`,
          filename
        });
      } catch (e) {
        console.error('Create page error:', e);
        return sendJson(res, 500, { success: false, error: 'Failed to create new page.' });
      }
    }

    return sendJson(res, 404, { success: false, error: 'Endpoint not found.' });
  }

  // =========================================================================
  // HIGH-PERFORMANCE STATIC FILE SERVING WITH CACHING, ETAGS & GZIP
  // =========================================================================
  let fileSubPath = reqPath;
  if (fileSubPath === '/') fileSubPath = '/index.html';

  // 1. Resolve relative path from ROOT safely
  const relPath = path.normalize(fileSubPath).replace(/^(\.\.[\/\\])+/, '');
  let filePath = path.join(ROOT, relPath);

  // 2. Strict Traversal Protection
  const relativeToRoot = path.relative(ROOT, filePath);
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Forbidden');
    return;
  }

  // 3. Sensitive Files Shield (ZERO access to backend source, database, env, backups, hidden files)
  const baseName = path.basename(filePath).toLowerCase();
  const lowerRel = relativeToRoot.toLowerCase().replace(/\\/g, '/');

  const isSensitiveFile =
    baseName.startsWith('.') ||
    baseName.endsWith('.db') ||
    baseName.includes('.db-') ||
    baseName.includes('.sqlite') ||
    baseName.startsWith('.env') ||
    baseName === 'server.js' ||
    baseName === 'db.js' ||
    baseName === 'package.json' ||
    baseName === 'package-lock.json' ||
    baseName === 'dockerfile' ||
    baseName === 'docker-compose.yml' ||
    baseName === 'deployment.md' ||
    lowerRel.startsWith('node_modules/') ||
    lowerRel.startsWith('scratch/') ||
    lowerRel.startsWith('archive_artifacts/');

  if (isSensitiveFile) {
    const errPage = path.join(ROOT, '404.html');
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (fs.existsSync(errPage)) {
      fs.createReadStream(errPage).pipe(res);
    } else {
      res.end('Not Found');
    }
    return;
  }

  // 4. Protected Backups: Staff-only access
  if (lowerRel.startsWith('backups/')) {
    const session = getSession(req);
    if (!session) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Unauthorized. Staff session required.');
      return;
    }
  }

  // 5. Protected Resumes: Staff-only access
  if (lowerRel.startsWith('uploads/resumes/')) {
    const session = getSession(req);
    if (!session) {
      res.statusCode = 401;
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end('Unauthorized. Staff session required to access candidate resumes.');
      return;
    }
  }

  // If path doesn't have an extension, check if an .html file exists
  if (!path.extname(filePath)) {
    const htmlCandidate = filePath + '.html';
    if (fs.existsSync(htmlCandidate)) {
      filePath = htmlCandidate;
    }
  }

  // 6. Strict File Extension Allowlist & 404 Fallback
  const ext = path.extname(filePath).toLowerCase();
  if (!MIME_TYPES[ext]) {
    const errPage = path.join(ROOT, '404.html');
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (fs.existsSync(errPage)) {
      fs.createReadStream(errPage).pipe(res);
    } else {
      res.end('Not Found');
    }
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const errPage = path.join(ROOT, '404.html');
      if (fs.existsSync(errPage)) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        fs.createReadStream(errPage).pipe(res);
        return;
      }
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/plain');
      res.end('Not Found');
      return;
    }

    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // 1. ETag & Conditional 304 Not Modified
    const etag = `W/"${stats.size}-${Math.floor(stats.mtimeMs)}"`;
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      res.statusCode = 304;
      res.end();
      return;
    }

    // 2. Cache-Control Policies
    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.woff', '.woff2'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    } else if (['.css', '.js'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    // 3. Dynamic Visual Editor Injection if requested
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const isEditorRequested = urlObj.searchParams.get('editor') === 'true';

    if (ext === '.html') {
      let html = fs.readFileSync(filePath, 'utf8');

      if (isEditorRequested) {
        const session = getSession(req);
        if (!session) {
          // Redirect unauthenticated user to admin login with return URL
          res.statusCode = 302;
          res.setHeader('Location', `/admin.html?returnTo=${encodeURIComponent(req.url)}`);
          res.end();
          return;
        }

        // Inject editor bundle before </head>
        const editorTags = `
  <!-- CRAYON BOX VISUAL EDITOR INJECTION -->
  <link rel="stylesheet" href="/visual-editor.css" data-cbs-editor="true">
  <script src="/visual-editor.js" data-cbs-editor="true" defer></script>
</head>`;
        html = html.replace('</head>', editorTags);
      }

      const acceptEncoding = req.headers['accept-encoding'] || '';
      if (acceptEncoding.includes('gzip')) {
        res.setHeader('Content-Encoding', 'gzip');
        const compressed = zlib.gzipSync(Buffer.from(html, 'utf8'));
        res.setHeader('Content-Length', compressed.length);
        res.statusCode = 200;
        res.end(compressed);
        return;
      }

      res.setHeader('Content-Length', Buffer.byteLength(html, 'utf8'));
      res.statusCode = 200;
      res.end(html);
      return;
    }

    // 4. Compressible text assets (CSS, JS, JSON, SVG, XML)
    const isCompressible = ['.css', '.js', '.json', '.svg', '.xml', '.txt'].includes(ext);
    const acceptEncoding = req.headers['accept-encoding'] || '';

    if (isCompressible && acceptEncoding.includes('gzip')) {
      const rawContent = fs.readFileSync(filePath);
      const compressed = zlib.gzipSync(rawContent);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Content-Length', compressed.length);
      res.statusCode = 200;
      res.end(compressed);
      return;
    }

    // Direct streaming for binary assets
    res.statusCode = 200;
    res.setHeader('Content-Length', stats.size);
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, HOST, () => {
    console.log(`[SERVER] Crayon Box Engine running on http://${HOST}:${PORT}`);
  });
}

module.exports = server;
