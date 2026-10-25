import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class DeleteAccountDto {
  // The CURRENT password, re-entered. A live session (or a stolen cookie)
  // alone must not be enough to destroy the account.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  password?: string;

  // Or, for accounts that sign in with Google (they have no usable
  // password): a fresh Google ID token for the linked Google account.
  @IsOptional()
  @IsString()
  @MaxLength(4096)
  googleCredential?: string;
}
