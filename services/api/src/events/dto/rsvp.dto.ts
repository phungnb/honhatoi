import { IsIn } from 'class-validator';

export class RsvpDto {
  @IsIn(['invited', 'accepted', 'declined', 'tentative'])
  rsvpStatus: string;
}
