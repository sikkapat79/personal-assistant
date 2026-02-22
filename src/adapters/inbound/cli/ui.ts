import ora from 'ora';

export function createSpinner(text: string): ReturnType<typeof ora> {
  return ora({ text });
}

export function say(message: string): void {
  console.log(message);
}

export function sayDone(message = 'Done.'): void {
  console.log(message);
}

export function sayError(message: string): void {
  console.error(message);
}
