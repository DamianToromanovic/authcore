import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
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

  async findByEmail(email: string): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
      `
      SELECT *
      FROM users
      WHERE email = $1
        AND deleted_at IS NULL
      `,
      [email],
    );
    return result.rows[0] ?? null;
  }

  async createUser(
    email: string,
    passwordHash: string,
  ): Promise<UserRow | null> {
    const result = await this.db.query<UserRow>(
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
