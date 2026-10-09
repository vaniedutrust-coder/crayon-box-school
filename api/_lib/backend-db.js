const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');

const isVercel = Boolean(process.env.VERCEL);
const DB_PATH = isVercel ? '/tmp/school.db' : path.resolve(__dirname, '..', '..', 'school.db');

// If running in Vercel serverless environment, copy seed database into /tmp
if (isVercel && !fs.existsSync(DB_PATH)) {
  const rootDb = path.resolve(__dirname, '..', '..', 'school.db');
  if (fs.existsSync(rootDb)) {
    try {
      fs.copyFileSync(rootDb, DB_PATH);
    } catch (e) {
      console.warn('[DB] Could not copy initial DB to /tmp:', e.message);
    }
  }
}

const db = new DatabaseSync(DB_PATH);

function hashPassword(password, customSalt) {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, hash) {
  try {
    const verifyHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
  } catch (e) {
    return false;
  }
}

function initDb() {
  // 1. Admissions Inquiries
  db.exec(`
    CREATE TABLE IF NOT EXISTS admissions_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_no TEXT UNIQUE NOT NULL,
      student_name TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      parent_email TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      grade_applied TEXT NOT NULL,
      dob TEXT,
      locality TEXT,
      previous_school TEXT,
      status TEXT DEFAULT 'PENDING',
      counselor_notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Campus Walkthrough Bookings
  db.exec(`
    CREATE TABLE IF NOT EXISTS campus_tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_ref TEXT UNIQUE NOT NULL,
      parent_name TEXT NOT NULL,
      parent_phone TEXT NOT NULL,
      parent_email TEXT NOT NULL,
      tour_date TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      child_grade TEXT NOT NULL,
      attendees INTEGER DEFAULT 2,
      status TEXT DEFAULT 'CONFIRMED',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 3. Careers & Faculty Applications
  db.exec(`
    CREATE TABLE IF NOT EXISTS job_applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_id TEXT UNIQUE NOT NULL,
      candidate_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      position_applied TEXT NOT NULL,
      qualification TEXT NOT NULL,
      experience_years INTEGER NOT NULL,
      cover_note TEXT DEFAULT '',
      resume_filename TEXT,
      resume_original_name TEXT,
      status TEXT DEFAULT 'NEW',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 4. Alumni Directory
  db.exec(`
    CREATE TABLE IF NOT EXISTS alumni_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      batch_year INTEGER NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      current_org TEXT NOT NULL,
      current_role TEXT NOT NULL,
      city TEXT,
      linkedin_url TEXT,
      mentorship_opt_in INTEGER DEFAULT 1,
      is_verified INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 5. Contact & Helpdesk Inquiries
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id TEXT UNIQUE NOT NULL,
      sender_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      category TEXT DEFAULT 'GENERAL',
      message TEXT NOT NULL,
      status TEXT DEFAULT 'UNREAD',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 6. Admin Users
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'ADMIN',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin user if not exists
  const existingAdmin = db.prepare('SELECT id FROM admin_users WHERE username = ?').get('admin');
  if (!existingAdmin) {
    const defaultPassword = process.env.CBS_ADMIN_DEFAULT_PASSWORD || 'cbs2026admin';
    const { salt, hash } = hashPassword(defaultPassword);
    db.prepare(`
      INSERT INTO admin_users (username, password_hash, salt, full_name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run('admin', hash, salt, 'Principal & Admissions Office', 'SUPER_ADMIN');
    console.log('[DB] Seeded default administrator: admin');
  }

  // Seed realistic sample inquiries if table is empty so dashboard is alive on first load
  const inquiryCount = db.prepare('SELECT COUNT(*) as count FROM admissions_inquiries').get().count;
  if (inquiryCount === 0) {
    const seedInquiries = [
      {
        app_no: 'CBS-ADM-2026-1001',
        student_name: 'Aarav Sharma',
        parent_name: 'Rajesh Sharma',
        parent_email: 'rajesh.sharma@gmail.com',
        parent_phone: '+91 98112 34567',
        grade_applied: 'Grade 1',
        dob: '2020-04-12',
        locality: 'Model Town',
        previous_school: 'Mother Pride Pre-School',
        status: 'INTERVIEW_SCHEDULED',
        counselor_notes: 'Parent interested in CBSE foundational framework. Interaction booked for Saturday.'
      },
      {
        app_no: 'CBS-ADM-2026-1002',
        student_name: 'Ananya Verma',
        parent_name: 'Pooja Verma',
        parent_email: 'pooja.verma@outlook.com',
        parent_phone: '+91 98734 56789',
        grade_applied: 'Kindergarten',
        dob: '2022-08-19',
        locality: 'Sant Nagar, Burari',
        previous_school: 'First Step Playway',
        status: 'PENDING',
        counselor_notes: 'Requested bus transport details from Sant Nagar main road.'
      },
      {
        app_no: 'CBS-ADM-2026-1003',
        student_name: 'Vivaan Malhotra',
        parent_name: 'Siddharth Malhotra',
        parent_email: 'siddharth.m@gmail.com',
        parent_phone: '+91 99101 23456',
        grade_applied: 'Grade 6',
        dob: '2015-11-05',
        locality: 'Civil Lines',
        previous_school: 'St. Xavier Junior School',
        status: 'REVIEWED',
        counselor_notes: 'Strong sports background in football and robotics.'
      }
    ];

    const insertStmt = db.prepare(`
      INSERT INTO admissions_inquiries 
      (app_no, student_name, parent_name, parent_email, parent_phone, grade_applied, dob, locality, previous_school, status, counselor_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const inq of seedInquiries) {
      insertStmt.run(
        inq.app_no, inq.student_name, inq.parent_name, inq.parent_email, 
        inq.parent_phone, inq.grade_applied, inq.dob, inq.locality, 
        inq.previous_school, inq.status, inq.counselor_notes
      );
    }

    // Seed sample tour bookings
    const insertTour = db.prepare(`
      INSERT INTO campus_tours (booking_ref, parent_name, parent_phone, parent_email, tour_date, time_slot, child_grade, attendees, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertTour.run('TOUR-2026-088', 'Dr. Meenakshi Iyer', '+91 98104 55112', 'meenakshi.iyer@aiims.edu', '2026-10-14', 'Morning 10:00 AM', 'Grade 4', 3, 'CONFIRMED', 'Interested in STEM and Maker space labs.');
    insertTour.run('TOUR-2026-089', 'Gaurav Batra', '+91 98111 88990', 'gaurav.batra@yahoo.com', '2026-10-15', 'Afternoon 12:30 PM', 'Nursery', 2, 'CONFIRMED', 'Requires campus tour of kindergarten sensory garden.');

    // Seed sample job applicant
    const insertJob = db.prepare(`
      INSERT INTO job_applications (app_id, candidate_name, email, phone, position_applied, qualification, experience_years, cover_note, resume_filename, resume_original_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertJob.run('CBS-FAC-2026-012', 'Sunita Rawat', 'sunita.rawat.edu@gmail.com', '+91 98109 23344', 'TGT Science & STEM', 'M.Sc (Physics), B.Ed, CTET Qualified', 5, '5 years of experiential science teaching experience in North Delhi CBSE schools.', null, null, 'SHORTLISTED');
    insertJob.run('CBS-FAC-2026-013', 'Rohit Chawla', 'rohit.sports@gmail.com', '+91 98711 44556', 'Physical Education & Football Coach', 'B.P.Ed, NIS Certified (Football)', 4, 'Coached sub-junior district football runners-up.', null, null, 'NEW');

    // Seed sample contact messages
    const insertMsg = db.prepare(`
      INSERT INTO contact_messages (ticket_id, sender_name, email, phone, category, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insertMsg.run('TICK-2026-041', 'Deepak Chopra', 'deepak.c@gmail.com', '+91 98115 67788', 'TRANSPORT', 'Could you please confirm if Route 4 bus has a dedicated pickup stop at Model Town Metro Gate 2?', 'UNREAD');

    console.log('[DB] Seeded initial sample inquiries, tours, and job candidates.');
  }
}

// Data Access Methods
const queries = {
  // Admissions
  createAdmission(data) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const app_no = `CBS-ADM-2026-${randomSuffix}`;
    const stmt = db.prepare(`
      INSERT INTO admissions_inquiries 
      (app_no, student_name, parent_name, parent_email, parent_phone, grade_applied, dob, locality, previous_school, status, counselor_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    stmt.run(
      app_no, data.studentName || '', data.parentName || '', data.email || '', 
      data.phone || '', data.grade || '', data.dob || '', data.locality || '', 
      data.previousSchool || '', data.notes || ''
    );
    return app_no;
  },

  getAdmissions(filter = {}) {
    let sql = 'SELECT * FROM admissions_inquiries WHERE 1=1';
    const params = [];
    if (filter.status && filter.status !== 'ALL') {
      sql += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter.grade && filter.grade !== 'ALL') {
      sql += ' AND grade_applied = ?';
      params.push(filter.grade);
    }
    sql += ' ORDER BY id DESC';
    return db.prepare(sql).all(...params);
  },

  updateAdmissionStatus(id, status, notes) {
    if (notes !== undefined) {
      db.prepare('UPDATE admissions_inquiries SET status = ?, counselor_notes = ? WHERE id = ?').run(status, notes, id);
    } else {
      db.prepare('UPDATE admissions_inquiries SET status = ? WHERE id = ?').run(status, id);
    }
    return true;
  },

  deleteInquiry(appNoOrId) {
    if (typeof appNoOrId === 'number' || /^\d+$/.test(appNoOrId)) {
      return db.prepare('DELETE FROM admissions_inquiries WHERE id = ?').run(Number(appNoOrId));
    }
    return db.prepare('DELETE FROM admissions_inquiries WHERE app_no = ?').run(String(appNoOrId));
  },

  // Campus Tours
  createTour(data) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const booking_ref = `TOUR-2026-${randomSuffix}`;
    const stmt = db.prepare(`
      INSERT INTO campus_tours 
      (booking_ref, parent_name, parent_phone, parent_email, tour_date, time_slot, child_grade, attendees, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)
    `);
    stmt.run(
      booking_ref, data.parentName || '', data.phone || '', data.email || '',
      data.date || '', data.timeSlot || '', data.grade || '', Number(data.attendees) || 2,
      data.notes || ''
    );
    return booking_ref;
  },

  getTours() {
    return db.prepare('SELECT * FROM campus_tours ORDER BY id DESC').all();
  },

  updateTourStatus(id, status) {
    db.prepare('UPDATE campus_tours SET status = ? WHERE id = ?').run(status, id);
    return true;
  },

  deleteTour(refOrId) {
    if (typeof refOrId === 'number' || /^\d+$/.test(refOrId)) {
      return db.prepare('DELETE FROM campus_tours WHERE id = ?').run(Number(refOrId));
    }
    return db.prepare('DELETE FROM campus_tours WHERE booking_ref = ?').run(String(refOrId));
  },

  // Job Applications
  createJobApplication(data) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const app_id = `CBS-FAC-2026-${randomSuffix}`;
    const stmt = db.prepare(`
      INSERT INTO job_applications 
      (app_id, candidate_name, email, phone, position_applied, qualification, experience_years, cover_note, resume_filename, resume_original_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NEW')
    `);
    stmt.run(
      app_id, data.candidateName || '', data.email || '', data.phone || '',
      data.position || '', data.qualification || '', Number(data.experience) || 0,
      data.coverNote || '', data.resumeFilename || null, data.resumeOriginalName || null
    );
    return app_id;
  },

  getJobApplications() {
    return db.prepare('SELECT * FROM job_applications ORDER BY id DESC').all();
  },

  updateJobStatus(id, status) {
    db.prepare('UPDATE job_applications SET status = ? WHERE id = ?').run(status, id);
    return true;
  },

  // Alumni Directory
  createAlumni(data) {
    const stmt = db.prepare(`
      INSERT INTO alumni_members 
      (full_name, batch_year, email, phone, current_org, current_role, city, linkedin_url, mentorship_opt_in, is_verified)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `);
    stmt.run(
      data.fullName || '', Number(data.batchYear) || 2024, data.email || '', data.phone || '',
      data.currentOrg || '', data.currentRole || '', data.city || '', data.linkedinUrl || '',
      data.mentorship ? 1 : 0
    );
    return true;
  },

  getAlumni(onlyVerified = true) {
    if (onlyVerified) {
      return db.prepare('SELECT * FROM alumni_members WHERE is_verified = 1 ORDER BY batch_year DESC, id DESC').all();
    }
    return db.prepare('SELECT * FROM alumni_members ORDER BY id DESC').all();
  },

  // Contact Messages
  createContactMessage(data) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const ticket_id = `TICK-2026-${randomSuffix}`;
    const stmt = db.prepare(`
      INSERT INTO contact_messages 
      (ticket_id, sender_name, email, phone, category, message, status)
      VALUES (?, ?, ?, ?, ?, ?, 'UNREAD')
    `);
    stmt.run(
      ticket_id, data.name || '', data.email || '', data.phone || '',
      data.category || 'GENERAL', data.message || ''
    );
    return ticket_id;
  },

  getContactMessages() {
    return db.prepare('SELECT * FROM contact_messages ORDER BY id DESC').all();
  },

  updateContactStatus(id, status) {
    db.prepare('UPDATE contact_messages SET status = ? WHERE id = ?').run(status, id);
    return true;
  },

  // Stats Overview
  getOverviewStats() {
    const totalAdmissions = db.prepare('SELECT COUNT(*) as c FROM admissions_inquiries').get().c;
    const pendingAdmissions = db.prepare("SELECT COUNT(*) as c FROM admissions_inquiries WHERE status = 'PENDING'").get().c;
    const totalTours = db.prepare('SELECT COUNT(*) as c FROM campus_tours').get().c;
    const totalJobs = db.prepare('SELECT COUNT(*) as c FROM job_applications').get().c;
    const unreadMessages = db.prepare("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'UNREAD'").get().c;
    const totalAlumni = db.prepare('SELECT COUNT(*) as c FROM alumni_members').get().c;

    const recentAdmissions = db.prepare('SELECT * FROM admissions_inquiries ORDER BY id DESC LIMIT 5').all();
    const recentTours = db.prepare('SELECT * FROM campus_tours ORDER BY id DESC LIMIT 5').all();

    return {
      stats: {
        totalAdmissions,
        pendingAdmissions,
        totalTours,
        totalJobs,
        unreadMessages,
        totalAlumni
      },
      recentAdmissions,
      recentTours
    };
  },

  // Auth
  verifyAdminCredentials(username, password) {
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
    if (!user) return null;
    if (verifyPassword(password, user.salt, user.password_hash)) {
      return { id: user.id, username: user.username, fullName: user.full_name, role: user.role };
    }
    return null;
  }
};

module.exports = {
  db,
  initDb,
  queries
};
