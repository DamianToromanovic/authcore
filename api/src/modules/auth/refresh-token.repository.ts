import { Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';
import { DatabaseService, DbClient } from 'src/database/database.service';

export interface RefreshTokenRow extends QueryResultRow {
  jti: string;
  session_id: string;
  token_hash: string;
  issued_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  replaced_by: string | null;
}

@Injectable()
export class RefreshTokenRepository {
  constructor(private readonly db: DatabaseService) {}

  private getClient(client?: DbClient) {
    return client ?? this.db;
  }

  async createRefreshToken(
    jti: string,
    sessionId: string,
    tokenHash: string,
    expiresAt: Date,
    client: DbClient,
  ): Promise<RefreshTokenRow> {
    const res = await this.getClient(client).query<RefreshTokenRow>(
      `
      INSERT INTO refresh_tokens (jti, session_id, token_hash, expires_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [jti, sessionId, tokenHash, expiresAt],
    );
    return res.rows[0];
  }

  async findRefreshTokenByJti(
    jti: string,
    client: DbClient,
  ): Promise<RefreshTokenRow | null> {
    const res = await this.getClient(client).query<RefreshTokenRow>(
      `
      SELECT *
      FROM refresh_tokens
      WHERE jti = $1
      LIMIT 1
      `,
      [jti],
    );
    return res.rows[0] ?? null;
  }

  async revokeAndReplace(
    currentJti: string,
    replacedByJti: string,
    client: DbClient,
  ): Promise<void> {
    await this.getClient(client).query(
      `
      UPDATE refresh_tokens
      SET revoked_at = now(),
          replaced_by = $2
      WHERE jti = $1
        AND revoked_at IS NULL
      `,
      [currentJti, replacedByJti],
    );
  }

  async revokeAllActiveForSession(
    sessionId: string,
    client: DbClient,
  ): Promise<void> {
    await this.getClient(client).query(
      `
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE session_id = $1
        AND revoked_at IS NULL
      `,
      [sessionId],
    );
  }
}
