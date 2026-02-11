import { Injectable } from '@nestjs/common';
import { DatabaseService, DbClient } from 'src/database/database.service';

@Injectable()
export class MembershipsRepository {
  constructor(private readonly db: DatabaseService) {}

  private getClient(client?: DbClient) {
    return client ?? this.db;
  }

  async createMembership(
    organizationId: string,
    userId: string,
    role: 'admin' | 'member',
    client?: DbClient,
  ): Promise<void> {
    await this.getClient(client).query(
      `
      INSERT INTO memberships (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [organizationId, userId, role],
    );
  }
}
