import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from '../../database/database.service';
import { UsersRepository } from '../users/users.repository';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly usersRepo: UsersRepository,
    private readonly orgRepo: OrganizationsRepository,
    private readonly membershipsRepo: MembershipsRepository,
  ) {}

  async register(dto: RegisterDto) {
    return this.db.withTransaction(async (client) => {
      const hash = await bcrypt.hash(dto.password, 12);

      //create user

      const userResult = await client.query(
        `
        
        INSERT INTO users (email, password_hash)
        VALUES ($1, $2)
        RETURNING *`,
        [dto.email, hash],
      );

      const user = userResult.rows[0];

      const slug = dto.organizationName.toLowerCase().replace(/\s+/g, '-');

      const orgResult = await client.query(
        `
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        RETURNING *
        `,
        [dto.organizationName, slug],
      );

      const org = orgResult.rows[0];

      await client.query(
        `
        INSERT INTO memberships (organization_id, user_id, role)
        VALUES ($1, $2, 'admin')
        RETURNING *`,
        [org.id, user.id],
      );

      return {
        userId: user.id,
        organizationId: org.id,
      };
    });
  }
}
