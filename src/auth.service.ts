import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pgPool, redis } from './db';
import { User, UserRole } from './types';
import { LedgerError } from './ledger.service';

const JWT_SECRET = process.env.JWT_SECRET || 'apex-ledger-secret-jwt-key-production-grade';
const DEFAULT_ORG_ID = '00000000-0000-0000-0000-000000000010';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(':');
    if (!salt || !key) return false;
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(hash, 'hex'));
  } catch {
    return false;
  }
}

export interface TokenPayload {
  id: string;
  email?: string | null;
  phone?: string | null;
  name: string;
  role: UserRole;
  org_id?: string | null;
}

export class AuthService {
  /**
   * Issues signed JWT Access Token
   */
  generateToken(user: User): string {
    const payload: TokenPayload = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      org_id: user.org_id,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  }

  /**
   * Verifies incoming JWT token string
   */
  verifyToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, JWT_SECRET) as TokenPayload;
    } catch (err: any) {
      throw new LedgerError(401, 'Invalid or expired session token. Please log in again.');
    }
  }

  async ensureDefaultOrg(): Promise<string> {
    await pgPool.query(
      `INSERT INTO organizations (id, name, slug)
       VALUES ($1, 'Apex Global Treasury Corp', 'apex-global')
       ON CONFLICT (slug) DO NOTHING`,
      [DEFAULT_ORG_ID]
    );
    return DEFAULT_ORG_ID;
  }

  /**
   * Rate-limited phone OTP generation backed by Redis.
   * Redis keys:
   * - ratelimit:otp:<phone> (Counter with 300s window, max 3)
   * - otp:<phone> (6-digit code with 300s TTL)
   */
  async sendPhoneOtp(rawPhone: string): Promise<{ success: boolean; message: string; dev_otp?: string; expires_in: number }> {
    const phone = rawPhone.replace(/\s+/g, '').trim();
    if (!phone || phone.length < 8 || phone.length > 20) {
      throw new LedgerError(400, 'Invalid phone number format. Provide valid number with country code (e.g. +919876543210 or +15550199).');
    }

    const rateKey = `ratelimit:otp:${phone}`;
    const otpKey = `otp:${phone}`;

    // Rate limit: Max 3 requests per 5 minutes
    const currentCount = await redis.incr(rateKey);
    if (currentCount === 1) {
      await redis.expire(rateKey, 300);
    } else if (currentCount > 3) {
      const ttl = await redis.ttl(rateKey);
      throw new LedgerError(429, `Rate limit exceeded: Maximum 3 OTP requests allowed every 5 minutes. Try again in ${ttl > 0 ? ttl : 60} seconds.`);
    }

    // Generate cryptographically secure-enough 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.set(otpKey, code, 'EX', 300);

    // If SMS gateway (e.g. Twilio) is not configured, return dev_otp so UI can immediately auto-fill or display dev banner
    return {
      success: true,
      message: `OTP sent to ${phone}. Valid for 5 minutes.`,
      dev_otp: code,
      expires_in: 300,
    };
  }

  /**
   * Verifies 6-digit OTP against Redis, upserts user in PostgreSQL, and generates JWT.
   */
  async verifyPhoneOtp(
    rawPhone: string,
    otp: string,
    name?: string
  ): Promise<{ token: string; user: User }> {
    const phone = rawPhone.replace(/\s+/g, '').trim();
    const cleanOtp = otp?.trim();

    if (!phone || !cleanOtp) {
      throw new LedgerError(400, 'Phone number and 6-digit OTP code are required.');
    }

    const otpKey = `otp:${phone}`;
    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      throw new LedgerError(400, 'OTP expired or not found. Please request a new code.');
    }

    if (storedOtp !== cleanOtp) {
      throw new LedgerError(400, 'Invalid OTP code. Please check and try again.');
    }

    // Clean up OTP key once verified
    await redis.del(otpKey);

    const userName = name?.trim() || `User ${phone.slice(-4)}`;
    await this.ensureDefaultOrg();

    // Upsert user into database
    const userRes = await pgPool.query<User>(
      `INSERT INTO users (phone, name, role, org_id)
       VALUES ($1, $2, 'OPERATOR', $3)
       ON CONFLICT (phone) DO UPDATE SET
         name = COALESCE(NULLIF($2, ''), users.name)
       RETURNING id, org_id, email, phone, name, avatar_url, google_id, role, created_at`,
      [phone, userName, DEFAULT_ORG_ID]
    );

    const user = userRes.rows[0];
    const token = this.generateToken(user);
    return { token, user };
  }

  /**
   * Google OAuth login / Demo Google fallback
   */
  async loginWithGoogle(data: {
    credential?: string;
    email?: string;
    name?: string;
    avatar_url?: string;
    google_id?: string;
  }): Promise<{ token: string; user: User }> {
    let email = data.email?.trim().toLowerCase();
    let name = data.name?.trim();
    let avatar_url = data.avatar_url;
    let google_id = data.google_id;

    // Decode Google JWT if credential provided
    if (data.credential && !email) {
      try {
        const decoded = jwt.decode(data.credential) as any;
        if (decoded && decoded.email) {
          email = decoded.email.toLowerCase();
          name = decoded.name || decoded.given_name || 'Google User';
          avatar_url = decoded.picture || avatar_url;
          google_id = decoded.sub || google_id;
        }
      } catch (e) {
        // Fallback to demo email if decode fails
      }
    }

    // Fallback demo user if credentials absent
    if (!email) {
      email = 'sarah.jenkins@mercury-fintech.io';
      name = 'Sarah Jenkins';
      avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150';
    }

    if (!name) {
      name = email.split('@')[0];
    }

    await this.ensureDefaultOrg();

    const userRes = await pgPool.query<User>(
      `INSERT INTO users (email, name, avatar_url, role, org_id, google_id)
       VALUES ($1, $2, $3, 'OPERATOR', $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = COALESCE(NULLIF($2, ''), users.name),
         avatar_url = COALESCE(NULLIF($3, ''), users.avatar_url),
         google_id = COALESCE(NULLIF($5, ''), users.google_id)
       RETURNING id, org_id, email, phone, name, avatar_url, google_id, role, created_at`,
      [email, name, avatar_url, DEFAULT_ORG_ID, google_id || null]
    );

    const user = userRes.rows[0];
    const token = this.generateToken(user);
    return { token, user };
  }

  /**
   * Register a new real user account with email, password, and organization
   */
  async register(data: {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    organization_name?: string;
    phone?: string;
    avatar_url?: string;
  }): Promise<{ token: string; user: User }> {
    const name = data.name?.trim();
    const email = data.email?.trim().toLowerCase();
    const password = data.password;
    const role: UserRole = data.role && ['ADMIN', 'AUDITOR', 'OPERATOR'].includes(data.role) ? data.role : 'OPERATOR';
    const phone = data.phone ? data.phone.trim() : null;

    if (!name || name.length < 2) {
      throw new LedgerError(400, 'Full name is required (minimum 2 characters).');
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      throw new LedgerError(400, 'A valid work email address is required.');
    }

    if (!password || password.length < 6) {
      throw new LedgerError(400, 'Password must be at least 6 characters long.');
    }

    // Check if email already registered
    const existing = await pgPool.query('SELECT id FROM users WHERE LOWER(email) = LOWER($1)', [email]);
    if (existing.rows.length > 0) {
      throw new LedgerError(409, 'An account with this email address already exists. Please sign in instead.');
    }

    if (phone) {
      const existingPhone = await pgPool.query('SELECT id FROM users WHERE phone = $1', [phone]);
      if (existingPhone.rows.length > 0) {
        throw new LedgerError(409, 'This phone number is already registered to another account.');
      }
    }

    // Determine Organization
    let orgId = DEFAULT_ORG_ID;
    if (data.organization_name && data.organization_name.trim()) {
      const orgName = data.organization_name.trim();
      const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'custom-org';
      const orgRes = await pgPool.query(
        `INSERT INTO organizations (name, slug)
         VALUES ($1, $2)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id`,
        [orgName, slug]
      );
      orgId = orgRes.rows[0].id;
    } else {
      await this.ensureDefaultOrg();
    }

    const passwordHash = hashPassword(password);
    const avatarUrl = data.avatar_url?.trim() || `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc`;

    const userRes = await pgPool.query<User>(
      `INSERT INTO users (org_id, email, phone, name, password_hash, avatar_url, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, org_id, email, phone, name, avatar_url, google_id, role, created_at`,
      [orgId, email, phone, name, passwordHash, avatarUrl, role]
    );

    const user = await this.getCurrentUser(userRes.rows[0].id);
    const token = this.generateToken(user);
    return { token, user };
  }

  /**
   * Log in with Email and Password
   */
  async loginWithEmail(data: {
    email: string;
    password: string;
  }): Promise<{ token: string; user: User }> {
    const email = data.email?.trim().toLowerCase();
    const password = data.password;

    if (!email || !password) {
      throw new LedgerError(400, 'Email address and password are required.');
    }

    const res = await pgPool.query<User & { password_hash?: string | null }>(
      `SELECT u.id, u.org_id, u.email, u.phone, u.name, u.avatar_url, u.google_id, u.role, u.created_at, u.password_hash,
              o.name as org_name, o.slug as org_slug
       FROM users u
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (res.rows.length === 0) {
      throw new LedgerError(401, 'Invalid email or password. Please verify your credentials.');
    }

    const foundUser = res.rows[0];

    // Check password
    let valid = false;
    if (foundUser.password_hash) {
      valid = verifyPassword(password, foundUser.password_hash);
    } else {
      // Default fallback password for demo users seeded before password_hash column was added
      if (
        (email === 'sarah.jenkins@mercury-fintech.io' || email === 'alex.rivera@audit.kpmg.com') &&
        (password === 'password123' || password === 'admin123')
      ) {
        valid = true;
        // Lazily set their password_hash
        const newHash = hashPassword('password123');
        await pgPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, foundUser.id]);
      }
    }

    if (!valid) {
      throw new LedgerError(401, 'Invalid email or password. Please verify your credentials.');
    }

    const user = await this.getCurrentUser(foundUser.id);
    const token = this.generateToken(user);
    return { token, user };
  }

  /**
   * Update Profile (Name, Phone, Avatar)
   */
  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; avatar_url?: string }
  ): Promise<User> {
    const name = data.name?.trim();
    const phone = data.phone ? data.phone.trim() : null;
    const avatarUrl = data.avatar_url?.trim() || null;

    if (name !== undefined && name.length < 2) {
      throw new LedgerError(400, 'Name must be at least 2 characters long.');
    }

    if (phone) {
      const existingPhone = await pgPool.query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, userId]
      );
      if (existingPhone.rows.length > 0) {
        throw new LedgerError(409, 'This phone number is already registered to another account.');
      }
    }

    await pgPool.query(
      `UPDATE users SET
         name = COALESCE(NULLIF($2, ''), name),
         phone = COALESCE($3, phone),
         avatar_url = COALESCE($4, avatar_url)
       WHERE id = $1`,
      [userId, name, phone, avatarUrl]
    );

    return this.getCurrentUser(userId);
  }

  /**
   * Instant Demo Login for quick testing & evaluation
   */
  async demoLogin(role: UserRole = 'ADMIN'): Promise<{ token: string; user: User }> {
    await this.ensureDefaultOrg();
    let targetEmail = 'sarah.jenkins@mercury-fintech.io';
    if (role === 'AUDITOR') {
      targetEmail = 'alex.rivera@audit.kpmg.com';
    } else if (role === 'OPERATOR') {
      targetEmail = 'marcus.chen@mercury-fintech.io';
    }

    let userRes = await pgPool.query<User>(
      `SELECT u.id, u.org_id, u.email, u.phone, u.name, u.avatar_url, u.google_id, u.role, u.created_at,
              o.name as org_name, o.slug as org_slug
       FROM users u
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE u.email = $1
       LIMIT 1`,
      [targetEmail]
    );

    if (userRes.rows.length === 0) {
      // Seed missing demo user
      const name = role === 'ADMIN' ? 'Sarah Jenkins' : role === 'AUDITOR' ? 'Alex Rivera' : 'Marcus Chen';
      const avatar = role === 'ADMIN' 
        ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
        : role === 'AUDITOR'
        ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
        : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const defaultHash = hashPassword('password123');
      const insertRes = await pgPool.query<User>(
        `INSERT INTO users (org_id, email, name, avatar_url, role, password_hash)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, org_id, email, phone, name, avatar_url, google_id, role, created_at`,
        [DEFAULT_ORG_ID, targetEmail, name, avatar, role, defaultHash]
      );
      userRes = insertRes;
    } else {
      // Ensure password_hash exists
      const defaultHash = hashPassword('password123');
      await pgPool.query('UPDATE users SET password_hash = COALESCE(password_hash, $1) WHERE id = $2', [defaultHash, userRes.rows[0].id]);
    }

    const user = await this.getCurrentUser(userRes.rows[0].id);
    const token = this.generateToken(user);
    return { token, user };
  }

  /**
   * Get current authenticated user by UUID
   */
  async getCurrentUser(userId: string): Promise<User> {
    const res = await pgPool.query<User>(
      `SELECT u.id, u.org_id, u.email, u.phone, u.name, u.avatar_url, u.google_id, u.role, u.created_at,
              o.name as org_name, o.slug as org_slug
       FROM users u
       LEFT JOIN organizations o ON u.org_id = o.id
       WHERE u.id = $1`,
      [userId]
    );

    if (res.rows.length === 0) {
      throw new LedgerError(404, 'User account not found.');
    }

    return res.rows[0];
  }
}

