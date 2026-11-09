import { IsBoolean } from 'class-validator';

export class NajavaPrisustvaDto {
  @IsBoolean({ message: 'Izaberi da li dolaziš.' })
  dolazi: boolean;
}
