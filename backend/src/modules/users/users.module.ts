import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { OrdersModule } from '../orders/orders.module';
import { GoogleIdTokenVerifier } from '../auth/google-id-token.verifier';

@Module({
  imports: [TypeOrmModule.forFeature([User]), OrdersModule],
  controllers: [UsersController],
  // GoogleIdTokenVerifier lives here (AuthModule imports this module) so
  // account deletion can confirm with Google too.
  providers: [UsersService, GoogleIdTokenVerifier],
  exports: [UsersService, GoogleIdTokenVerifier],
})
export class UsersModule {}
