// api/src/auth/token.service.ts
import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface RefreshClaims {
  sub: string; // user_id
  sid: string; // session_id
  jti: string; // refresh token id
}

export interface AccessClaims {
  sub: string;
  // optional: org context + role
  // org?: string;
  // role?: 'admin' | 'member';
}

@Injectable()
export class TokenService {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET!;
  private readonly refreshSecret = process.env.JWT_REFRESH_SECRET!;
  private readonly accessTtlSeconds = Number(
    process.env.JWT_ACCESS_TTL_SECONDS ?? 900,
  );
  private readonly refreshTtlSeconds = Number(
    process.env.JWT_REFRESH_TTL_SECONDS ?? 60 * 60 * 24 * 30,
  );

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  newJti(): string {
    return randomUUID();
  }

  signAccess(claims: AccessClaims): { token: string; expiresAt: Date } {
    const token = jwt.sign(claims, this.accessSecret, {
      expiresIn: this.accessTtlSeconds,
    });
    const expiresAt = new Date(Date.now() + this.accessTtlSeconds * 1000);
    return { token, expiresAt };
  }

  signRefresh(claims: RefreshClaims): { token: string; expiresAt: Date } {
    const token = jwt.sign(claims, this.refreshSecret, {
      expiresIn: this.refreshTtlSeconds,
    });
    const expiresAt = new Date(Date.now() + this.refreshTtlSeconds * 1000);
    return { token, expiresAt };
  }

  verifyRefresh(token: string): RefreshClaims {
    return jwt.verify(token, this.refreshSecret) as RefreshClaims;
  }
}
