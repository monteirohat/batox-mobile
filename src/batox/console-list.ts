import type { ConsoleSystem } from './api';

// The last list of systems read for each console, so a system's screen opens at once
const last = new Map<string, { emulationStation: boolean; consoles: ConsoleSystem[] }>();

export const rememberConsoles = (id: string, data: { emulationStation: boolean; consoles: ConsoleSystem[] }) => last.set(id, data);
export const recallConsoles = (id: string) => last.get(id);
