import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { Request, Response } from 'express';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED) // gibt dann bei succes 201 => korrekt bei ressourcen herstellung
  async registerUser(@Body() dto: RegisterDto) {
    const result = await this.authService.registerUser(dto);
    return {};
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const out = await this.authService.loginUser(
      dto,
      req.headers['user-agent'] ?? null,
      req.ip ?? null,
    );

    res.cookie('rt', out.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/refresh',
      expires: out.refreshExpiresAt,
    });

    return {
      accessToken: out.accessToken,
      accessExpiresAt: out.accessExpiresAt,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.rt;

    if (!refreshToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const result = await this.authService.refresh(refreshToken);

    // rotate cookie
    res.cookie('rt', result.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/refresh',
      expires: result.refreshExpiresAt,
    });

    return {
      accessToken: result.accessToken,
      accessExpiresAt: result.accessExpiresAt,
    };
  }

  // LOGOUT

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.rt;

    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // clear cookie
    res.clearCookie('rt', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/auth/refresh',
    });

    return { success: true };
  }
}
