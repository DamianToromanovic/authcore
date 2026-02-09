import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MembershipsRepository {
  constructor(private readonly db: DatabaseService) {}

  async createMembership(
    organizationId: string,
    userId: string,
    role: 'admin' | 'member',
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO memberships (organization_id, user_id, role)
      VALUES ($1, $2, $3)
      `,
      [organizationId, userId, role],
    );
  }
}
