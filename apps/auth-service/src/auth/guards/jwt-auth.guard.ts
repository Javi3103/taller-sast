import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard que utiliza la estrategia JWT
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}