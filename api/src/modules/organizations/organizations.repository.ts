import { Injectable } from '@nestjs/common';
import { DatabaseService, DbClient } from 'src/database/database.service';
import { QueryResultRow } from 'pg';

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

@Injectable()
export class OrganizationsRepository {
  constructor(private readonly db: DatabaseService) {}

  private getClient(client?: DbClient) {
    return client ?? this.db;
  }

  async createOrganization(
    name: string,
    slug: string,
    client?: DbClient,
  ): Promise<OrganizationRow> {
    const result = await this.getClient(client).query<OrganizationRow>(
      `
      INSERT INTO organizations (name, slug)
      VALUES ($1, $2)
      RETURNING *
      `,
      [name, slug],
    );
    return result.rows[0];
  }
}
