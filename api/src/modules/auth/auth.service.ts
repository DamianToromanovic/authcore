import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { UsersRepository } from '../users/users.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { RegisterDto } from './dto/register.dto';
import { RefreshSessionRepository } from './refresh-session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersRepo: UsersRepository,
    private readonly orgRepo: OrganizationsRepository,
    private readonly membershipsRepo: MembershipsRepository,
    private readonly sessions: RefreshSessionRepository,
    private readonly tokens: RefreshTokenRepository,
    private readonly tokenService: TokenService,
  ) {}

  async registerUser(dto: RegisterDto) {
    return this.db.withTransaction(async (client) => {
      const hash = await bcrypt.hash(dto.password, 12);

      // create user
      const user = await this.usersRepo.createUser(dto.email, hash, client);

      if (!user) {
        throw new Error('User creation failed');
      }

      // create organization
      const slug = dto.organizationName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const org = await this.orgRepo.createOrganization(
        dto.organizationName,
        slug,
        client,
      );

      if (!org) {
        throw new Error('Organization creation failed');
      }

      // create membership
      await this.membershipsRepo.createMembership(
        org.id,
        user.id,
        'admin',
        client,
      );

      return {
        userId: user.id,
        organizationId: org.id,
      };
    });
  }

  async loginUser(dto: LoginDto, userAgent: string | null, ip: string | null) {
    return this.db.withTransaction(async (client) => {
      const user = await this.usersRepo.findActiveByEmail(dto.email, client);

      if (!user) {
        throw new Error('Invalid credentials');
      }

      const valid = await bcrypt.compare(dto.password, user.password_hash);

      if (!valid) {
        throw new Error('Invalid credentials');
      }

      const session = await this.sessions.createSession(
        user.id,
        userAgent,
        ip,
        client,
      );

      const jti = this.tokenService.newJti();

      const refresh = this.tokenService.signRefresh({
        sub: user.id,
        sid: session.id,
        jti,
      });

      const hash = this.tokenService.hashToken(refresh.token);

      await this.tokens.createRefreshToken(
        jti,
        session.id,
        hash,
        refresh.expiresAt,
        client,
      );

      const access = this.tokenService.signAccess({
        sub: user.id,
      });

      return {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken: refresh.token,
        refreshExpiresAt: refresh.expiresAt,
      };
    });
  }

  async refresh(refreshJwt: string) {
    return this.db.withTransaction(async (client) => {
      const claims = this.tokenService.verifyRefresh(refreshJwt);
      const presentedHash = this.tokenService.hashToken(refreshJwt);

      const dbToken = await this.tokens.findRefreshTokenByJti(
        claims.jti,
        client,
      );

      if (!dbToken) throw new Error('Invalid refresh token');

      if (dbToken.revoked_at) {
        await this.sessions.revokeSession(dbToken.session_id, client);
        await this.tokens.revokeAllActiveForSession(dbToken.session_id, client);
        throw new Error('Refresh token reuse detected');
      }

      if (dbToken.token_hash !== presentedHash) {
        await this.sessions.revokeSession(dbToken.session_id, client);
        await this.tokens.revokeAllActiveForSession(dbToken.session_id, client);
        throw new Error('Invalid refresh token');
      }

      const session = await this.sessions.findActiveSessionById(
        dbToken.session_id,
        client,
      );

      if (!session) throw new Error('Session revoked');

      // 🔥 ROTATION
      const newJti = this.tokenService.newJti();

      const newRefresh = this.tokenService.signRefresh({
        sub: session.user_id,
        sid: session.id,
        jti: newJti,
      });

      const newHash = this.tokenService.hashToken(newRefresh.token);

      await this.tokens.createRefreshToken(
        newJti,
        session.id,
        newHash,
        newRefresh.expiresAt,
        client,
      );

      await this.tokens.revokeAndReplace(dbToken.jti, newJti, client);

      const access = this.tokenService.signAccess({
        sub: session.user_id,
      });

      return {
        accessToken: access.token,
        accessExpiresAt: access.expiresAt,
        refreshToken: newRefresh.token,
        refreshExpiresAt: newRefresh.expiresAt,
      };
    });
  }

  async logout(refreshJwt: string) {
    return this.db.withTransaction(async (client) => {
      const claims = this.tokenService.verifyRefresh(refreshJwt);

      await this.sessions.revokeSession(claims.sid, client);
      await this.tokens.revokeAllActiveForSession(claims.sid, client);

      return true;
    });
  }
}
