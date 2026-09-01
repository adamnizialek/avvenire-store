import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteAccountDto {
  // The CURRENT password, re-entered. A live session (or a stolen cookie)
  // alone must not be enough to destroy the account.
  @IsString()
  @IsNotEmpty()
  password: string;
}
