import { Injectable } from '@nestjs/common';
import { DatabaseService, DbClient } from 'src/database/database.service';
import { QueryResultRow } from 'pg';

interface UserRow extends QueryResultRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

@Injectable()
export class UsersRepository {
  constructor(private readonly db: DatabaseService) {}

  private getClient(client?: DbClient) {
    return client ?? this.db;
  }

  async findByEmail(email: string, client?: DbClient): Promise<UserRow | null> {
    const result = await this.getClient(client).query<UserRow>(
      `
      SELECT *
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [email],
    );

    return result.rows[0] ?? null;
  }

  async createUser(
    email: string,
    passwordHash: string,
    client?: DbClient,
  ): Promise<UserRow> {
    const result = await this.getClient(client).query<UserRow>(
      `
      INSERT INTO users (email, password_hash)
      VALUES ($1, $2)
      RETURNING *
      `,
      [email, passwordHash],
    );

    return result.rows[0];
  }
}
