import { Injectable } from '@nestjs/common';
import { QueryResultRow } from 'pg';
import { DatabaseService, DbClient } from 'src/database/database.service';

export interface RefreshSessionRow extends QueryResultRow {
  id: string;
  user_id: string;
  created_at: Date;
  revoked_at: Date | null;
  user_agent: string | null;
  ip: string | null;
}

@Injectable()
export class RefreshSessionRepository {
  constructor(private readonly db: DatabaseService) {}

  private getClient(client?: DbClient) {
    return client ?? this.db;
  }

  async createSession(
    userId: string,
    userAgent: string | null,
    ip: string | null,
    client?: DbClient,
  ): Promise<RefreshSessionRow> {
    const result = await this.getClient(client).query<RefreshSessionRow>(
      `
      INSERT INTO refresh_sessions (user_id, user_agent, ip)
      VALUES ($1, $2, $3)
      RETURNING *
      `,
      [userId, userAgent, ip],
    );

    return result.rows[0];
  }

  async findActiveSessionById(
    sessionId: string,
  ): Promise<RefreshSessionRow | null> {
    const result = await this.db.query<RefreshSessionRow>(
      `
      SELECT *
      FROM refresh_sessions
      WHERE id = $1
        AND revoked_at IS NULL
      LIMIT 1
      `,
      [sessionId],
    );
    return result.rows[0];
  }
}
