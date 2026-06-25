import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService, // inyectar ConfigService
  ) {}

  // Registro público de nuevo usuario (devuelve tokens)
  async register(dto: any) {
    const user = await this.usersService.create(dto);
    return this.generateTokens(user);
  }

  // Validar credenciales para login local
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) return null;
    // Renombramos la propiedad 'password' para evitar conflicto
    const { password: _, refreshToken, ...result } = user;
    return result;
  }

  // Iniciar sesión (devuelve tokens)
  async login(user: any) {
    return this.generateTokens(user);
  }

  // Generar access y refresh tokens

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Token de acceso con expiración por defecto (definido en JwtModule)
    const accessToken = this.jwtService.sign(payload);

    // Obtener expiración del refresh token desde ConfigService, con valor por defecto tipado
    const refreshExpiration = this.configService.get<string>(
      'REFRESH_EXPIRATION',
      '7d',
    );

    // Forzar el tipo a 'string' y luego a la unión esperada (number | StringValue)
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: refreshExpiration as any, // o usar una aserción más precisa
    });

    // Guardar hash del refresh token
    const hashedRefresh = await bcrypt.hash(refreshToken, 10);
    await this.usersService.save({ ...user, refreshToken: hashedRefresh });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // Renovar tokens usando refresh token
  async refreshToken(userId: string, refreshToken: string) {
    const user = await this.usersService.findOne(userId);
    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    const isValid = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    // Rotar refresh token (revocar el anterior)
    return this.generateTokens(user);
  }

  // Cerrar sesión (invalidar refresh token)
  async logout(userId: string) {
    await this.usersService.update(userId, { refreshToken: null } as any);
  }
}
