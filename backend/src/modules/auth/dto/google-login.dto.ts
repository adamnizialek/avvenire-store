import { IsString, MaxLength } from 'class-validator';

export class GoogleLoginDto {
  /** The ID token (JWT) from Google Identity Services. */
  @IsString()
  @MaxLength(4096)
  credential: string;
}
