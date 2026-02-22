export interface LogInputDto {
  date: string;
  title?: string;
  notes?: string;
  score?: number;
  mood?: number;
  energy?: number;
  deepWorkHours?: number;
  workout?: boolean;
  diet?: boolean;
  readingMins?: number;
  wentWell?: string;
  improve?: string;
  gratitude?: string;
  tomorrow?: string;
}

export interface LogResultDto {
  created: boolean;
  date: string;
}
