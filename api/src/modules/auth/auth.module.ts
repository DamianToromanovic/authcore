import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { MembershipsModule } from '../memberships/memberships.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { RefreshSessionRepository } from './refresh-session.repository';
import { RefreshTokenRepository } from './refresh-token.repository';
import { TokenService } from './token.service';

@Module({
  imports: [MembershipsModule, OrganizationsModule, UsersModule],
  providers: [
    AuthService,
    TokenService,
    RefreshSessionRepository,
    RefreshTokenRepository,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
