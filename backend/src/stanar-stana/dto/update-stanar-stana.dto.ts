import { IsBoolean } from 'class-validator';

export class UpdateStanarStanaDto {
  @IsBoolean({ message: 'Izaberi da li je vlasnik ili ukućanin.' })
  vlasnik: boolean;
}
